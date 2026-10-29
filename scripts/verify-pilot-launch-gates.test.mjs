import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePilotLaunchGates } from "./verify-pilot-launch-gates.mjs";

function readyFixture() {
  return {
    diagnostics: {
      environment: "staging",
      auth: {
        admin_two_factor_required: true,
        current_user_two_factor_enabled: true,
        login_two_factor_challenge_enforced: true,
        platform_owner_password_configured: true,
        seed_test_accounts_enabled: false,
        two_factor_recovery_supported: true
      },
      payments: {
        implementation_ready: true,
        provider_mode: "PROVIDER_BACKED",
        provider_request_timeout_seconds: 20,
        staging_candidate_ready: true,
        stripe: { adapter_ready: true, checkout_ready: true, refund_ready: true },
        flutterwave: { adapter_ready: true, checkout_ready: true, refund_ready: true }
      },
      runtime: { csrf_same_origin_enforced: true, redis_configured: true },
      session: {
        cookie_secure: true,
        refresh_rotation_enabled: true,
        trusted_admin_origin_configured: true,
        trusted_member_origin_configured: true,
        trusted_super_admin_origin_configured: true
      },
      storage: {
        malware_scanner_ready: true,
        malware_scanner_transport_ready: true,
        provider: "S3",
        retention_days: 180,
        s3_credentials_ready: true,
        s3_resilience_policy_ready: true,
        storage_target_ready: true
      },
      workers: {
        expense_retention_lock_ready: true,
        expense_retention_runtime: { last_run_status: "succeeded", overdue: false },
        mwf_runtime: { last_run_status: "skipped", overdue: false },
        notification_digest_runtime: { last_run_status: "succeeded", overdue: false },
        worker_pipeline_ready: true
      }
    },
    storageProbe: { provider: "S3", reachable: true }
  };
}

function gateMap(fixture) {
  return Object.fromEntries(
    evaluatePilotLaunchGates(fixture.diagnostics, fixture.storageProbe).map((gate) => [
      gate.name,
      gate.ready
    ])
  );
}

test("all pilot launch gates pass for a production-shaped staging runtime", () => {
  const fixture = readyFixture();
  assert.deepEqual(gateMap(fixture), {
    payments: true,
    security: true,
    storage: true,
    workers: true
  });
});

test("payment gate checks implementation readiness without requiring live credentials", () => {
  const fixture = readyFixture();
  fixture.diagnostics.payments.provider_mode = "LOCAL_TEST";
  fixture.diagnostics.payments.staging_candidate_ready = false;
  fixture.diagnostics.payments.stripe.checkout_ready = false;
  fixture.diagnostics.payments.flutterwave.refund_ready = false;
  assert.equal(gateMap(fixture).payments, true);
});

test("payment gate rejects missing adapter implementation readiness", () => {
  const fixture = readyFixture();
  fixture.diagnostics.payments.flutterwave.adapter_ready = false;
  assert.equal(gateMap(fixture).payments, false);
});

test("security gate rejects insecure cookies or enabled staging seeds", () => {
  const fixture = readyFixture();
  fixture.diagnostics.session.cookie_secure = false;
  fixture.diagnostics.auth.seed_test_accounts_enabled = true;
  assert.equal(gateMap(fixture).security, false);
});

test("security gate requires login-time two-factor challenge enforcement", () => {
  const fixture = readyFixture();
  fixture.diagnostics.auth.login_two_factor_challenge_enforced = false;
  assert.equal(gateMap(fixture).security, false);
});

test("storage gate requires a reachable S3 target", () => {
  const fixture = readyFixture();
  fixture.storageProbe.reachable = false;
  assert.equal(gateMap(fixture).storage, false);
});

test("worker gate rejects overdue or failed worker families", () => {
  const fixture = readyFixture();
  fixture.diagnostics.workers.notification_digest_runtime.overdue = true;
  assert.equal(gateMap(fixture).workers, false);
});
