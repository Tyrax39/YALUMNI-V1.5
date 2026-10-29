import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const BASE_URL_SETTINGS = [
  "API_BASE_URL",
  "WEB_BASE_URL",
  "ADMIN_CONSOLE_BASE_URL",
  "SUPER_ADMIN_CONSOLE_BASE_URL"
];

const RELEASE_SETTINGS = ["YALUMNI_RELEASE_SHA", "YALUMNI_RELEASE_VERSION"];
const PRODUCTION_ENVS = new Set(["staging", "production"]);
const GIT_SHA_PATTERN = /^[0-9a-f]{7,64}$/i;

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

function configuredUrl(env, name) {
  try {
    return configured(env, name) ? new URL(env[name]) : null;
  } catch {
    return null;
  }
}

function listValue(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function missing(env, names) {
  return names.filter((name) => !configured(env, name));
}

function missingOrigins(originList, requiredOrigins) {
  return requiredOrigins.filter((origin) => !originList.includes(origin));
}

function httpsOrLoopback(url) {
  if (!url) return false;
  return (
    url.protocol === "https:" ||
    ["127.0.0.1", "localhost"].includes(url.hostname)
  );
}

function isSecureCookieEnabled(value) {
  return ["1", "true", "yes"].includes(String(value ?? "").trim().toLowerCase());
}

function validReleaseVersion(value) {
  const normalized = String(value ?? "").trim();
  return Boolean(normalized && !/[\s<>]/.test(normalized));
}

export function evaluateDeploymentReadiness(env, options = {}) {
  const requireStrict = Boolean(options.requireStrict);
  const appEnv = String(env.APP_ENV || "local").trim().toLowerCase();
  const baseUrls = Object.fromEntries(
    BASE_URL_SETTINGS.map((name) => [name, configuredUrl(env, name)])
  );
  const frontendOrigins = [
    baseUrls.WEB_BASE_URL,
    baseUrls.ADMIN_CONSOLE_BASE_URL,
    baseUrls.SUPER_ADMIN_CONSOLE_BASE_URL
  ]
    .filter(Boolean)
    .map((url) => url.origin);
  const corsOrigins = listValue(env.CORS_ORIGINS);
  const trustedOrigins = listValue(env.YALUMNI_TRUSTED_ORIGINS);
  const nextPublicApiBaseUrl = configuredUrl(env, "NEXT_PUBLIC_API_BASE_URL");
  const missingBaseUrls = missing(env, BASE_URL_SETTINGS);
  const invalidBaseUrls = BASE_URL_SETTINGS.filter((name) => configured(env, name) && !baseUrls[name]);
  const insecureBaseUrls = BASE_URL_SETTINGS.filter((name) => !httpsOrLoopback(baseUrls[name]));
  const missingCorsOrigins = missingOrigins(corsOrigins, frontendOrigins);
  const missingTrustedOrigins = missingOrigins(trustedOrigins, frontendOrigins);
  const nextPublicApiMatches =
    Boolean(nextPublicApiBaseUrl && baseUrls.API_BASE_URL) &&
    nextPublicApiBaseUrl.origin === baseUrls.API_BASE_URL.origin;
  const releaseMissing = missing(env, RELEASE_SETTINGS);
  const releaseShaValid = GIT_SHA_PATTERN.test(String(env.YALUMNI_RELEASE_SHA ?? "").trim());
  const releaseVersionValid = validReleaseVersion(env.YALUMNI_RELEASE_VERSION);
  const cookieSameSite = String(env.YALUMNI_COOKIE_SAME_SITE || "lax").trim().toLowerCase();
  const cookieSameSiteReady = ["lax", "strict", "none"].includes(cookieSameSite);
  const cookieSecureReady = isSecureCookieEnabled(env.YALUMNI_COOKIE_SECURE);
  const proxyHeaderTrustReady = getFlag(env, "YALUMNI_TRUST_PROXY_HEADERS");
  const refreshCookieDays = Number(env.YALUMNI_REFRESH_COOKIE_DAYS ?? 30);
  const refreshCookieReady = Number.isFinite(refreshCookieDays) && refreshCookieDays > 0;

  const baseUrlsReady =
    missingBaseUrls.length === 0 &&
    invalidBaseUrls.length === 0 &&
    (!requireStrict || insecureBaseUrls.length === 0);
  const originPolicyReady =
    missingCorsOrigins.length === 0 &&
    (!requireStrict || missingTrustedOrigins.length === 0);
  const runtimePolicyReady =
    cookieSameSiteReady &&
    refreshCookieReady &&
    (!requireStrict || (cookieSecureReady && proxyHeaderTrustReady && PRODUCTION_ENVS.has(appEnv)));
  const releaseReady =
    !requireStrict ||
    (releaseMissing.length === 0 && releaseShaValid && releaseVersionValid);

  return {
    require_strict: requireStrict,
    app_env: appEnv,
    base_urls_ready: baseUrlsReady,
    origin_policy_ready: originPolicyReady,
    runtime_policy_ready: runtimePolicyReady,
    release_ready: releaseReady,
    deployment_ready:
      baseUrlsReady &&
      originPolicyReady &&
      runtimePolicyReady &&
      nextPublicApiMatches &&
      releaseReady,
    next_public_api_matches: nextPublicApiMatches,
    missing_base_url_settings: missingBaseUrls,
    invalid_base_url_settings: invalidBaseUrls,
    insecure_base_url_settings: insecureBaseUrls,
    missing_cors_origins: missingCorsOrigins,
    missing_trusted_origins: missingTrustedOrigins,
    missing_release_settings: releaseMissing,
    release_sha_valid: releaseShaValid,
    release_version_valid: releaseVersionValid,
    cookie_same_site: cookieSameSite,
    cookie_secure_ready: cookieSecureReady,
    proxy_header_trust_ready: proxyHeaderTrustReady,
    refresh_cookie_days: refreshCookieDays
  };
}

function envFileFromArgs(args) {
  const index = args.indexOf("--env-file");
  if (index >= 0) return args[index + 1];
  if (process.env.DEPLOYMENT_ENV_FILE) return process.env.DEPLOYMENT_ENV_FILE;
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
  const requireStrict =
    args.includes("--strict") || getFlag(env, "DEPLOYMENT_REQUIRE_STRICT_RELEASE");
  const result = evaluateDeploymentReadiness(env, { requireStrict });

  console.log(`Deployment readiness source: ${envFile}`);
  console.log(`Environment: ${result.app_env}`);
  console.log(`Base URLs: ${result.base_urls_ready ? "PASS" : "FAIL"}`);
  console.log(`Origin policy: ${result.origin_policy_ready ? "PASS" : "FAIL"}`);
  console.log(`Runtime policy: ${result.runtime_policy_ready ? "PASS" : "FAIL"}`);
  console.log(`Proxy header trust: ${result.proxy_header_trust_ready ? "PASS" : "PENDING"}`);
  console.log(`Release metadata: ${result.release_ready ? "PASS" : "PENDING"}`);
  console.log(`Release SHA format: ${result.release_sha_valid ? "PASS" : "FAIL"}`);
  console.log(`Release version format: ${result.release_version_valid ? "PASS" : "FAIL"}`);
  console.log(`Next public API URL: ${result.next_public_api_matches ? "PASS" : "FAIL"}`);
  printList("Missing base URL settings", result.missing_base_url_settings);
  printList("Invalid base URL settings", result.invalid_base_url_settings);
  printList("Insecure base URL settings", result.insecure_base_url_settings);
  printList("Missing CORS origins", result.missing_cors_origins);
  printList("Missing trusted origins", result.missing_trusted_origins);
  printList("Missing release settings", result.missing_release_settings);

  if (!result.deployment_ready) {
    throw new Error(
      result.require_strict
        ? "Deployment readiness failed for strict staging or production release"
        : "Deployment readiness failed before strict release metadata handoff"
    );
  }

  console.log(
    result.require_strict
      ? "Deployment readiness passed for strict staging or production release."
      : "Deployment readiness passed; strict release metadata may be supplied later."
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
