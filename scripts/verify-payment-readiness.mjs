import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SECRET_SETTINGS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "FLUTTERWAVE_SECRET_KEY",
  "FLUTTERWAVE_WEBHOOK_SECRET_HASH"
];

const NON_SECRET_SETTINGS = [
  "STRIPE_CHECKOUT_SUCCESS_URL",
  "STRIPE_CHECKOUT_CANCEL_URL",
  "FLUTTERWAVE_CHECKOUT_REDIRECT_URL"
];

const SUPPORTED_PROVIDERS = new Set(["LOCAL_TEST", "STRIPE", "FLUTTERWAVE"]);
const REQUIRED_RETURN_URL_TOKENS = ["{campaign_id}", "{payment_intent_id}"];

function parseEnvFile(path) {
  if (!path || !existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^"(.*)"$/, "$1");
        return [key, value];
      })
  );
}

function getFlag(env, name) {
  return ["1", "true", "yes"].includes(String(env[name] ?? "").trim().toLowerCase());
}

function configured(env, name) {
  return Boolean(String(env[name] ?? "").trim());
}

function missing(env, names) {
  return names.filter((name) => !configured(env, name));
}

function normalizeProvider(value) {
  return String(value || "LOCAL_TEST").trim().toUpperCase();
}

function validHttpsUrlTemplate(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function missingReturnUrlTokens(env) {
  return NON_SECRET_SETTINGS.flatMap((setting) =>
    REQUIRED_RETURN_URL_TOKENS.filter((token) => !String(env[setting] ?? "").includes(token)).map(
      (token) => `${setting}:${token}`
    )
  );
}

export function evaluatePaymentReadiness(env, options = {}) {
  const checkoutProvider = normalizeProvider(env.CONTRIBUTION_CHECKOUT_PROVIDER);
  const refundProvider = normalizeProvider(env.CONTRIBUTION_REFUND_PROVIDER);
  const timeoutSeconds = Number(env.CONTRIBUTION_PROVIDER_REQUEST_TIMEOUT_SECONDS ?? 20);
  const invalidProviders = [checkoutProvider, refundProvider].filter(
    (provider) => !SUPPORTED_PROVIDERS.has(provider)
  );
  const missingNonSecretSettings = missing(env, NON_SECRET_SETTINGS);
  const invalidReturnUrls = NON_SECRET_SETTINGS.filter(
    (setting) => configured(env, setting) && !validHttpsUrlTemplate(env[setting])
  );
  const missingReturnUrlTemplateTokens = missingReturnUrlTokens(env);
  const missingSecretSettings = missing(env, SECRET_SETTINGS);
  const implementationReady = Boolean(
    invalidProviders.length === 0 && Number.isFinite(timeoutSeconds) && timeoutSeconds > 0
  );
  const nonSecretConfigurationReady = missingNonSecretSettings.length === 0;
  const credentialConfigurationReady =
    nonSecretConfigurationReady && missingSecretSettings.length === 0;
  const requireSecrets = Boolean(options.requireSecrets);
  const requireProduction = Boolean(options.requireProduction);
  const productionConfigurationReady =
    invalidReturnUrls.length === 0 && missingReturnUrlTemplateTokens.length === 0;
  const handoffReady =
    implementationReady &&
    nonSecretConfigurationReady &&
    (!requireProduction || productionConfigurationReady) &&
    (!requireSecrets || credentialConfigurationReady);

  return {
    checkout_provider: checkoutProvider,
    refund_provider: refundProvider,
    provider_request_timeout_seconds: timeoutSeconds,
    implementation_ready: implementationReady,
    non_secret_configuration_ready: nonSecretConfigurationReady,
    credential_configuration_ready: credentialConfigurationReady,
    production_configuration_ready: productionConfigurationReady,
    handoff_ready: handoffReady,
    require_secrets: requireSecrets,
    require_production: requireProduction,
    invalid_providers: invalidProviders,
    missing_non_secret_settings: missingNonSecretSettings,
    invalid_return_urls: invalidReturnUrls,
    missing_return_url_template_tokens: missingReturnUrlTemplateTokens,
    missing_secret_settings: missingSecretSettings
  };
}

function envFileFromArgs(args) {
  const index = args.indexOf("--env-file");
  if (index >= 0) return args[index + 1];
  if (process.env.PAYMENT_ENV_FILE) return process.env.PAYMENT_ENV_FILE;
  if (existsSync(".env")) return ".env";
  return ".env.example";
}

function printList(label, values) {
  if (!values.length) return;
  console.log(`${label}: ${values.join(", ")}`);
}

async function main() {
  const args = process.argv.slice(2);
  const envFile = envFileFromArgs(args);
  assert(envFile, "--env-file requires a path");
  const fileEnv = parseEnvFile(envFile);
  const env = { ...fileEnv, ...process.env };
  const requireSecrets =
    args.includes("--require-secrets") || getFlag(env, "PAYMENT_REQUIRE_PROVIDER_SECRETS");
  const requireProduction =
    args.includes("--require-production") || getFlag(env, "PAYMENT_REQUIRE_PRODUCTION_CONFIG");
  const result = evaluatePaymentReadiness(env, { requireSecrets, requireProduction });

  console.log(`Payment readiness source: ${envFile}`);
  console.log(`Checkout provider: ${result.checkout_provider}`);
  console.log(`Refund provider: ${result.refund_provider}`);
  console.log(`Implementation readiness: ${result.implementation_ready ? "PASS" : "FAIL"}`);
  console.log(
    `Non-secret configuration: ${result.non_secret_configuration_ready ? "PASS" : "FAIL"}`
  );
  console.log(
    `Credential configuration: ${
      result.credential_configuration_ready ? "PASS" : result.require_secrets ? "FAIL" : "PENDING"
    }`
  );
  console.log(
    `Production return configuration: ${
      result.production_configuration_ready ? "PASS" : result.require_production ? "FAIL" : "PENDING"
    }`
  );
  printList("Invalid providers", result.invalid_providers);
  printList("Missing non-secret settings", result.missing_non_secret_settings);
  printList("Invalid production return URLs", result.invalid_return_urls);
  printList("Missing return URL template tokens", result.missing_return_url_template_tokens);
  printList("Missing secret settings", result.missing_secret_settings);

  if (!result.handoff_ready) {
    throw new Error(
      result.require_secrets
        ? "Payment readiness failed with required provider credentials missing or invalid"
        : result.require_production
          ? "Payment readiness failed with required production return configuration missing or invalid"
        : "Payment readiness failed before provider credential handoff"
    );
  }

  console.log(
    result.require_secrets
      ? "Payment readiness passed with provider credentials configured."
      : "Payment readiness passed; provider secrets may be added later."
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
