import assert from "node:assert/strict";
import test from "node:test";

import { evaluateDeploymentReadiness } from "./verify-deployment-readiness.mjs";

function localEnv() {
  return {
    APP_ENV: "local",
    API_BASE_URL: "http://localhost:8002",
    WEB_BASE_URL: "http://localhost:3010",
    ADMIN_CONSOLE_BASE_URL: "http://localhost:3011",
    SUPER_ADMIN_CONSOLE_BASE_URL: "http://localhost:3012",
    NEXT_PUBLIC_API_BASE_URL: "http://localhost:8002",
    CORS_ORIGINS:
      "http://localhost:3010,http://localhost:3011,http://localhost:3012",
    YALUMNI_TRUSTED_ORIGINS:
      "http://localhost:3010,http://localhost:3011,http://localhost:3012",
    YALUMNI_COOKIE_SAME_SITE: "lax",
    YALUMNI_REFRESH_COOKIE_DAYS: "30"
  };
}

function stagingEnv() {
  return {
    APP_ENV: "staging",
    API_BASE_URL: "https://yalumni-v15-api-954095.azurewebsites.net",
    WEB_BASE_URL: "https://yalumni-v15-member-954095.azurewebsites.net",
    ADMIN_CONSOLE_BASE_URL: "https://yalumni-v15-admin-954095.azurewebsites.net",
    SUPER_ADMIN_CONSOLE_BASE_URL: "https://yalumni-v15-superadmin-954095.azurewebsites.net",
    NEXT_PUBLIC_API_BASE_URL: "https://yalumni-v15-api-954095.azurewebsites.net",
    CORS_ORIGINS:
      "https://yalumni-v15-member-954095.azurewebsites.net,https://yalumni-v15-admin-954095.azurewebsites.net,https://yalumni-v15-superadmin-954095.azurewebsites.net",
    YALUMNI_TRUSTED_ORIGINS:
      "https://yalumni-v15-member-954095.azurewebsites.net,https://yalumni-v15-admin-954095.azurewebsites.net,https://yalumni-v15-superadmin-954095.azurewebsites.net",
    YALUMNI_COOKIE_SAME_SITE: "none",
    YALUMNI_COOKIE_SECURE: "true",
    YALUMNI_TRUST_PROXY_HEADERS: "true",
    YALUMNI_REFRESH_COOKIE_DAYS: "30",
    YALUMNI_RELEASE_SHA: "abc1234",
    YALUMNI_RELEASE_VERSION: "v1.5.0-staging"
  };
}

test("deployment readiness passes local handoff mode without release metadata", () => {
  const result = evaluateDeploymentReadiness(localEnv());

  assert.equal(result.deployment_ready, true);
  assert.equal(result.release_ready, true);
  assert.equal(result.next_public_api_matches, true);
});

test("deployment readiness strict mode requires staging-shaped settings", () => {
  const result = evaluateDeploymentReadiness(localEnv(), { requireStrict: true });

  assert.equal(result.deployment_ready, false);
  assert.equal(result.runtime_policy_ready, false);
  assert.deepEqual(result.missing_release_settings, [
    "YALUMNI_RELEASE_SHA",
    "YALUMNI_RELEASE_VERSION"
  ]);
});

test("deployment readiness strict mode passes for Azure staging shape", () => {
  const result = evaluateDeploymentReadiness(stagingEnv(), { requireStrict: true });

  assert.equal(result.deployment_ready, true);
  assert.equal(result.base_urls_ready, true);
  assert.equal(result.origin_policy_ready, true);
  assert.equal(result.runtime_policy_ready, true);
});

test("deployment readiness rejects mismatched public API URL", () => {
  const result = evaluateDeploymentReadiness({
    ...localEnv(),
    NEXT_PUBLIC_API_BASE_URL: "http://localhost:9999"
  });

  assert.equal(result.next_public_api_matches, false);
  assert.equal(result.deployment_ready, false);
});

test("deployment readiness strict mode requires explicit proxy header trust", () => {
  const result = evaluateDeploymentReadiness(
    { ...stagingEnv(), YALUMNI_TRUST_PROXY_HEADERS: "false" },
    { requireStrict: true }
  );

  assert.equal(result.proxy_header_trust_ready, false);
  assert.equal(result.runtime_policy_ready, false);
  assert.equal(result.deployment_ready, false);
});

test("deployment readiness reports missing frontend origins", () => {
  const result = evaluateDeploymentReadiness({
    ...localEnv(),
    CORS_ORIGINS: "http://localhost:3010"
  });

  assert.equal(result.origin_policy_ready, false);
  assert.deepEqual(result.missing_cors_origins, [
    "http://localhost:3011",
    "http://localhost:3012"
  ]);
});

test("deployment readiness strict mode rejects malformed release SHAs", () => {
  const result = evaluateDeploymentReadiness(
    { ...stagingEnv(), YALUMNI_RELEASE_SHA: "not-a-git-sha" },
    { requireStrict: true }
  );

  assert.equal(result.release_sha_valid, false);
  assert.equal(result.release_ready, false);
  assert.equal(result.deployment_ready, false);
});

test("deployment readiness strict mode rejects placeholder release versions", () => {
  const result = evaluateDeploymentReadiness(
    { ...stagingEnv(), YALUMNI_RELEASE_VERSION: "<release-version>" },
    { requireStrict: true }
  );

  assert.equal(result.release_version_valid, false);
  assert.equal(result.release_ready, false);
  assert.equal(result.deployment_ready, false);
});
