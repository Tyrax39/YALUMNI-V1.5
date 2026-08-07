import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const UPLOAD_DIR_SETTINGS = [
  "VERIFICATION_UPLOAD_DIR",
  "PROFILE_PHOTO_UPLOAD_DIR",
  "COMMUNITY_POST_MEDIA_UPLOAD_DIR",
  "CONTRIBUTION_EXPENSE_EVIDENCE_UPLOAD_DIR"
];

const S3_SETTINGS = [
  "S3_ENDPOINT_URL",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_BUCKET_NAME",
  "S3_REGION"
];

const SUPPORTED_STORAGE_PROVIDERS = new Set(["LOCAL", "S3"]);
const SUPPORTED_SCANNER_PROVIDERS = new Set(["SIGNATURE_ONLY", "HTTP"]);
const SUPPORTED_LOCK_PROVIDERS = new Set(["NONE", "REDIS"]);

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

function numberValue(env, name, fallback) {
  return Number(env[name] ?? fallback);
}

function normalize(value, fallback) {
  return String(value || fallback).trim().toUpperCase();
}

function validHttpUrl(value) {
  if (!value) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function secureUrl(value) {
  return validHttpUrl(value) && new URL(value).protocol === "https:";
}

function secureRedisUrl(value) {
  try {
    return new URL(String(value)).protocol === "rediss:";
  } catch {
    return false;
  }
}

export function evaluateOpsReadiness(env, options = {}) {
  const requireProduction = Boolean(options.requireProduction);
  const storageProvider = normalize(env.UPLOAD_STORAGE_PROVIDER, "LOCAL");
  const scannerProvider = normalize(
    env.CONTRIBUTION_EXPENSE_EVIDENCE_MALWARE_SCANNER_PROVIDER,
    "SIGNATURE_ONLY"
  );
  const lockProvider = normalize(
    env.CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_LOCK_PROVIDER,
    "NONE"
  );
  const missingUploadDirs = missing(env, UPLOAD_DIR_SETTINGS);
  const missingS3Settings = missing(env, S3_SETTINGS);
  const redisConfigured = configured(env, "REDIS_URL");
  const redisTransportReady = !requireProduction || secureRedisUrl(env.REDIS_URL);
  const storageTimeoutsReady = [
    numberValue(env, "S3_CONNECT_TIMEOUT_SECONDS", 3),
    numberValue(env, "S3_READ_TIMEOUT_SECONDS", 10),
    numberValue(env, "S3_MAX_ATTEMPTS", 3)
  ].every((value) => Number.isFinite(value) && value > 0);
  const scannerTimeout = numberValue(
    env,
    "CONTRIBUTION_EXPENSE_EVIDENCE_MALWARE_SCANNER_TIMEOUT_SECONDS",
    5
  );
  const scannerTimeoutReady = Number.isFinite(scannerTimeout) && scannerTimeout > 0;
  const scannerTransportReady =
    scannerProvider === "SIGNATURE_ONLY" ||
    (requireProduction
      ? secureUrl(env.CONTRIBUTION_EXPENSE_EVIDENCE_MALWARE_SCANNER_URL)
      : validHttpUrl(env.CONTRIBUTION_EXPENSE_EVIDENCE_MALWARE_SCANNER_URL));
  const storageReady = Boolean(
    SUPPORTED_STORAGE_PROVIDERS.has(storageProvider) &&
      missingUploadDirs.length === 0 &&
      storageTimeoutsReady &&
      (!requireProduction ||
        (storageProvider === "S3" &&
          missingS3Settings.length === 0 &&
          secureUrl(env.S3_ENDPOINT_URL)))
  );

  const workerIntervalsReady = [
    numberValue(env, "MWF_DIRECTORY_SYNC_WORKER_INTERVAL_SECONDS", 3600),
    numberValue(env, "NOTIFICATION_DIGEST_WORKER_INTERVAL_SECONDS", 3600),
    numberValue(env, "CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_INTERVAL_SECONDS", 86400),
    numberValue(env, "CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_LIMIT", 100),
    numberValue(env, "CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_LOCK_TTL_SECONDS", 900),
    numberValue(env, "NOTIFICATION_DIGEST_WORKER_LIMIT", 100),
    numberValue(env, "NOTIFICATION_DIGEST_WORKER_MAX_ITEMS_PER_EMAIL", 10)
  ].every((value) => Number.isFinite(value) && value > 0);
  const workerSourcesReady = [
    "MWF_DIRECTORY_FELLOWS_URL",
    "MWF_DIRECTORY_FILTERS_URL",
    "MWF_DIRECTORY_USER_AGENT",
    "NOTIFICATION_DIGEST_WORKER_FREQUENCIES",
    "CONTRIBUTION_EXPENSE_CATEGORY_TAXONOMY"
  ].every((name) => configured(env, name));
  const lockReady = Boolean(
    SUPPORTED_LOCK_PROVIDERS.has(lockProvider) &&
      (!requireProduction || (lockProvider === "REDIS" && redisConfigured && redisTransportReady))
  );
  const workerReady = Boolean(workerIntervalsReady && workerSourcesReady && lockReady);
  const scannerReady = Boolean(
    SUPPORTED_SCANNER_PROVIDERS.has(scannerProvider) && scannerTimeoutReady && scannerTransportReady
  );

  return {
    require_production: requireProduction,
    storage_provider: storageProvider,
    storage_ready: storageReady,
    worker_ready: workerReady,
    scanner_ready: scannerReady,
    ops_ready: storageReady && workerReady && scannerReady,
    lock_provider: lockProvider,
    redis_configured: redisConfigured,
    redis_transport_ready: redisTransportReady,
    scanner_provider: scannerProvider,
    missing_upload_dir_settings: missingUploadDirs,
    missing_s3_settings: missingS3Settings,
    storage_timeouts_ready: storageTimeoutsReady,
    worker_intervals_ready: workerIntervalsReady,
    worker_sources_ready: workerSourcesReady,
    lock_ready: lockReady,
    scanner_transport_ready: scannerTransportReady
  };
}

function envFileFromArgs(args) {
  const index = args.indexOf("--env-file");
  if (index >= 0) return args[index + 1];
  if (process.env.OPS_ENV_FILE) return process.env.OPS_ENV_FILE;
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
  const requireProduction =
    args.includes("--require-production") || getFlag(env, "OPS_REQUIRE_PRODUCTION_TARGETS");
  const result = evaluateOpsReadiness(env, { requireProduction });

  console.log(`Ops readiness source: ${envFile}`);
  console.log(`Storage provider: ${result.storage_provider}`);
  console.log(`Scanner provider: ${result.scanner_provider}`);
  console.log(`Worker lock provider: ${result.lock_provider}`);
  console.log(`Storage readiness: ${result.storage_ready ? "PASS" : "FAIL"}`);
  console.log(`Scanner readiness: ${result.scanner_ready ? "PASS" : "FAIL"}`);
  console.log(`Worker readiness: ${result.worker_ready ? "PASS" : "FAIL"}`);
  printList("Missing upload directory settings", result.missing_upload_dir_settings);
  printList("Missing S3 settings", result.missing_s3_settings);

  if (!result.ops_ready) {
    throw new Error(
      result.require_production
        ? "Ops readiness failed for production storage or worker targets"
        : "Ops readiness failed before production target handoff"
    );
  }

  console.log(
    result.require_production
      ? "Ops readiness passed for production-shaped storage and worker targets."
      : "Ops readiness passed; production storage and worker targets may be supplied later."
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
