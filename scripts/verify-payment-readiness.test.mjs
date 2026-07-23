import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePaymentReadiness } from "./verify-payment-readiness.mjs";

function baseEnv() {
  return {
    CONTRIBUTION_CHECKOUT_PROVIDER: "STRIPE",
    CONTRIBUTION_REFUND_PROVIDER: "FLUTTERWAVE",
    CONTRIBUTION_PROVIDER_REQUEST_TIMEOUT_SECONDS: "20",
    STRIPE_CHECKOUT_SUCCESS_URL:
      "https://member.example.com/contributions/{campaign_id}?payment_intent_id={payment_intent_id}&status=success",
    STRIPE_CHECKOUT_CANCEL_URL:
      "https://member.example.com/contributions/{campaign_id}?payment_intent_id={payment_intent_id}&status=canceled",
    FLUTTERWAVE_CHECKOUT_REDIRECT_URL:
      "https://member.example.com/contributions/{campaign_id}?payment_intent_id={payment_intent_id}&status=return"
  };
}

test("payment handoff passes implementation mode before secrets are supplied", () => {
  const result = evaluatePaymentReadiness(baseEnv());

  assert.equal(result.implementation_ready, true);
  assert.equal(result.non_secret_configuration_ready, true);
  assert.equal(result.credential_configuration_ready, false);
  assert.equal(result.handoff_ready, true);
  assert.deepEqual(result.missing_secret_settings, [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "FLUTTERWAVE_SECRET_KEY",
    "FLUTTERWAVE_WEBHOOK_SECRET_HASH"
  ]);
});

test("payment handoff enforces secrets in strict mode", () => {
  const result = evaluatePaymentReadiness(baseEnv(), { requireSecrets: true });

  assert.equal(result.implementation_ready, true);
  assert.equal(result.credential_configuration_ready, false);
  assert.equal(result.handoff_ready, false);
});

test("payment handoff passes strict mode when secrets are supplied", () => {
  const result = evaluatePaymentReadiness(
    {
      ...baseEnv(),
      STRIPE_SECRET_KEY: "sk_test_placeholder",
      STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
      FLUTTERWAVE_SECRET_KEY: "flw_secret_placeholder",
      FLUTTERWAVE_WEBHOOK_SECRET_HASH: "flw_hash_placeholder"
    },
    { requireSecrets: true }
  );

  assert.equal(result.credential_configuration_ready, true);
  assert.equal(result.handoff_ready, true);
  assert.deepEqual(result.missing_secret_settings, []);
});

test("payment handoff blocks missing return URLs even when secrets are deferred", () => {
  const env = baseEnv();
  delete env.FLUTTERWAVE_CHECKOUT_REDIRECT_URL;
  const result = evaluatePaymentReadiness(env);

  assert.equal(result.non_secret_configuration_ready, false);
  assert.equal(result.handoff_ready, false);
  assert.deepEqual(result.missing_non_secret_settings, ["FLUTTERWAVE_CHECKOUT_REDIRECT_URL"]);
});

test("payment handoff rejects unsupported provider names", () => {
  const result = evaluatePaymentReadiness({
    ...baseEnv(),
    CONTRIBUTION_CHECKOUT_PROVIDER: "UNSUPPORTED"
  });

  assert.equal(result.implementation_ready, false);
  assert.equal(result.handoff_ready, false);
  assert.deepEqual(result.invalid_providers, ["UNSUPPORTED"]);
});
