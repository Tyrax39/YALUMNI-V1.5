import assert from "node:assert/strict";
import test from "node:test";

import { evaluateOpsReadiness } from "./verify-ops-readiness.mjs";

function baseEnv() {
  return {
    VERIFICATION_UPLOAD_DIR: ".local/uploads/verification",
    PROFILE_PHOTO_UPLOAD_DIR: ".local/uploads/profile-photos",
    COMMUNITY_POST_MEDIA_UPLOAD_DIR: ".local/uploads/community-post-media",
    CONTRIBUTION_EXPENSE_EVIDENCE_UPLOAD_DIR: ".local/uploads/contribution-expense-evidence",
    CONTRIBUTION_EXPENSE_EVIDENCE_MALWARE_SCANNER_PROVIDER: "SIGNATURE_ONLY",
    CONTRIBUTION_EXPENSE_EVIDENCE_MALWARE_SCANNER_TIMEOUT_SECONDS: "5",
    MWF_DIRECTORY_FELLOWS_URL:
      "https://www.mandelawashingtonfellowship.org/wp-json/yali/v1/fellows/",
    MWF_DIRECTORY_FILTERS_URL:
      "https://www.mandelawashingtonfellowship.org/wp-json/yali/v1/directory_filters/",
    MWF_DIRECTORY_USER_AGENT: "YALUMNI-V1.5/1.0 test",
    MWF_DIRECTORY_SYNC_WORKER_INTERVAL_SECONDS: "3600",
    NOTIFICATION_DIGEST_WORKER_INTERVAL_SECONDS: "3600",
    NOTIFICATION_DIGEST_WORKER_FREQUENCIES: "DAILY,WEEKLY",
    NOTIFICATION_DIGEST_WORKER_LIMIT: "100",
    NOTIFICATION_DIGEST_WORKER_MAX_ITEMS_PER_EMAIL: "10",
    CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_INTERVAL_SECONDS: "86400",
    CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_LIMIT: "100",
    CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_LOCK_PROVIDER: "NONE",
    CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_LOCK_TTL_SECONDS: "900",
    CONTRIBUTION_EXPENSE_CATEGORY_TAXONOMY:
      "LEARNING_MATERIALS:Learning materials,TRAVEL:Travel,OTHER:Other",
    S3_CONNECT_TIMEOUT_SECONDS: "3",
    S3_READ_TIMEOUT_SECONDS: "10",
    S3_MAX_ATTEMPTS: "3"
  };
}

test("ops readiness passes local handoff mode before production targets are supplied", () => {
  const result = evaluateOpsReadiness(baseEnv());

  assert.equal(result.ops_ready, true);
  assert.equal(result.storage_provider, "LOCAL");
  assert.equal(result.lock_provider, "NONE");
  assert.deepEqual(result.missing_s3_settings, [
    "S3_ENDPOINT_URL",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "S3_BUCKET_NAME",
    "S3_REGION"
  ]);
});

test("ops readiness requires S3 and Redis worker lock in production mode", () => {
  const result = evaluateOpsReadiness(baseEnv(), { requireProduction: true });

  assert.equal(result.storage_ready, false);
  assert.equal(result.worker_ready, false);
  assert.equal(result.ops_ready, false);
});

test("ops readiness passes production mode with S3 and Redis lock settings", () => {
  const result = evaluateOpsReadiness(
    {
      ...baseEnv(),
      UPLOAD_STORAGE_PROVIDER: "S3",
      S3_ENDPOINT_URL: "https://s3.example.com",
      S3_ACCESS_KEY_ID: "access-key",
      S3_SECRET_ACCESS_KEY: "secret-key",
      S3_BUCKET_NAME: "yalumni-private",
      S3_REGION: "us-east-1",
      CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_LOCK_PROVIDER: "REDIS"
    },
    { requireProduction: true }
  );

  assert.equal(result.storage_ready, true);
  assert.equal(result.worker_ready, true);
  assert.equal(result.ops_ready, true);
  assert.deepEqual(result.missing_s3_settings, []);
});

test("ops readiness rejects invalid scanner transport", () => {
  const result = evaluateOpsReadiness({
    ...baseEnv(),
    CONTRIBUTION_EXPENSE_EVIDENCE_MALWARE_SCANNER_PROVIDER: "HTTP"
  });

  assert.equal(result.scanner_ready, false);
  assert.equal(result.scanner_transport_ready, false);
  assert.equal(result.ops_ready, false);
});

test("ops readiness rejects non-positive cadence settings", () => {
  const result = evaluateOpsReadiness({
    ...baseEnv(),
    NOTIFICATION_DIGEST_WORKER_INTERVAL_SECONDS: "0"
  });

  assert.equal(result.worker_intervals_ready, false);
  assert.equal(result.worker_ready, false);
});
