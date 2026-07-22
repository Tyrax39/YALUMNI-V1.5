import { pathToFileURL } from "node:url";

export function evaluatePilotLaunchGates(diagnostics, storageProbe) {
  const paymentReady = Boolean(
    diagnostics.payments?.provider_mode === "PROVIDER_BACKED" &&
      diagnostics.payments?.staging_candidate_ready &&
      diagnostics.payments?.stripe?.checkout_ready &&
      diagnostics.payments?.stripe?.refund_ready &&
      diagnostics.payments?.flutterwave?.checkout_ready &&
      diagnostics.payments?.flutterwave?.refund_ready
  );
  const securityReady = Boolean(
    ["production", "staging"].includes(diagnostics.environment) &&
      diagnostics.auth?.admin_two_factor_required &&
      diagnostics.auth?.current_user_two_factor_enabled &&
      diagnostics.auth?.login_two_factor_challenge_enforced &&
      diagnostics.auth?.platform_owner_password_configured &&
      diagnostics.auth?.two_factor_recovery_supported &&
      !diagnostics.auth?.seed_test_accounts_enabled &&
      diagnostics.runtime?.csrf_same_origin_enforced &&
      diagnostics.session?.cookie_secure &&
      diagnostics.session?.refresh_rotation_enabled &&
      diagnostics.session?.trusted_member_origin_configured &&
      diagnostics.session?.trusted_admin_origin_configured &&
      diagnostics.session?.trusted_super_admin_origin_configured
  );
  const storageReady = Boolean(
    diagnostics.storage?.provider === "S3" &&
      diagnostics.storage?.storage_target_ready &&
      diagnostics.storage?.s3_credentials_ready &&
      diagnostics.storage?.s3_resilience_policy_ready &&
      diagnostics.storage?.malware_scanner_ready &&
      diagnostics.storage?.malware_scanner_transport_ready &&
      diagnostics.storage?.retention_days > 0 &&
      storageProbe?.provider === "S3" &&
      storageProbe?.reachable
  );
  const workerRuntimes = [
    diagnostics.workers?.mwf_runtime,
    diagnostics.workers?.notification_digest_runtime,
    diagnostics.workers?.expense_retention_runtime
  ];
  const workersReady = Boolean(
    diagnostics.runtime?.redis_configured &&
      diagnostics.workers?.worker_pipeline_ready &&
      diagnostics.workers?.expense_retention_lock_ready &&
      workerRuntimes.every(
        (runtime) =>
          runtime &&
          !runtime.overdue &&
          !["failed", "never"].includes(String(runtime.last_run_status).toLowerCase())
      )
  );

  return [
    { name: "payments", ready: paymentReady },
    { name: "security", ready: securityReady },
    { name: "storage", ready: storageReady },
    { name: "workers", ready: workersReady }
  ];
}

class CookieJar {
  cookies = new Map();

  header() {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  store(response) {
    const values =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [response.headers.get("set-cookie")].filter(Boolean);
    for (const cookie of values) {
      const pair = cookie.split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator > 0) {
        this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
      }
    }
  }
}

async function readJson(response, label) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${label} returned ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function runPilotLaunchGate() {
  const baseUrl = (process.env.RELEASE_SUPERADMIN_URL ?? "http://127.0.0.1:3012").replace(
    /\/$/,
    ""
  );
  const parsedBaseUrl = new URL(baseUrl);
  const loopback = ["127.0.0.1", "localhost"].includes(parsedBaseUrl.hostname);
  if (parsedBaseUrl.protocol !== "https:" && !loopback) {
    throw new Error("RELEASE_SUPERADMIN_URL must use HTTPS outside loopback development");
  }
  const email = process.env.PILOT_SUPERADMIN_EMAIL;
  const password = process.env.PILOT_SUPERADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("PILOT_SUPERADMIN_EMAIL and PILOT_SUPERADMIN_PASSWORD are required");
  }

  const jar = new CookieJar();
  const request = async (path, options = {}) => {
    const headers = new Headers(options.headers ?? {});
    const cookie = jar.header();
    if (cookie) headers.set("cookie", cookie);
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(20_000)
    });
    jar.store(response);
    return response;
  };

  const csrf = await readJson(await request("/api/session/csrf"), "CSRF request");
  const csrfHeaders = { "x-csrf-token": csrf.csrf_token };
  await readJson(
    await request("/api/session/login", {
      body: JSON.stringify({ email, password }),
      headers: { ...csrfHeaders, "content-type": "application/json" },
      method: "POST"
    }),
    "Super-admin login"
  );
  const diagnostics = await readJson(
    await request("/api/backend/api/v1/system/diagnostics", { headers: csrfHeaders }),
    "System diagnostics"
  );
  const storageProbe = await readJson(
    await request("/api/backend/api/v1/system/storage-probe", {
      headers: csrfHeaders,
      method: "POST"
    }),
    "Storage probe"
  );
  const gates = evaluatePilotLaunchGates(diagnostics, storageProbe);
  for (const gate of gates) {
    console.log(`${gate.ready ? "PASS" : "FAIL"} ${gate.name}`);
  }
  const failed = gates.filter((gate) => !gate.ready);
  if (failed.length) {
    throw new Error(`Pilot launch gates failed: ${failed.map((gate) => gate.name).join(", ")}`);
  }
  console.log("Pilot launch gates passed: payments, security, storage, and workers are ready.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runPilotLaunchGate();
}
