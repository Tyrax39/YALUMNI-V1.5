const apiBaseUrl = (process.env.RELEASE_API_URL ?? "http://127.0.0.1:8002").replace(/\/$/, "");
const expectedEnvironment = process.env.RELEASE_EXPECTED_ENVIRONMENT;
const response = await fetch(`${apiBaseUrl}/api/v1/system/readiness`, {
  signal: AbortSignal.timeout(15_000)
});
const payload = await response.json().catch(() => ({}));

if (!response.ok) {
  throw new Error(
    `Runtime readiness failed with ${response.status}: ${JSON.stringify(payload)}`
  );
}
if (payload.status !== "ready") {
  throw new Error(`API reported readiness status ${payload.status ?? "missing"}`);
}
if (!payload.database_reachable || !payload.migrations_current) {
  const currentRevisions = Array.isArray(payload.migration_current_revisions)
    ? payload.migration_current_revisions.join(", ") || "none"
    : "unknown";
  const expectedHeads = Array.isArray(payload.migration_expected_heads)
    ? payload.migration_expected_heads.join(", ") || "none"
    : "unknown";
  throw new Error(
    `Database connectivity or migration readiness is incomplete (current: ${currentRevisions}; expected: ${expectedHeads})`
  );
}
if (payload.redis_required && !payload.redis_reachable) {
  throw new Error("Redis is required but unreachable");
}
if (expectedEnvironment && payload.environment !== expectedEnvironment) {
  throw new Error(
    `API environment ${payload.environment ?? "missing"} does not match ${expectedEnvironment}`
  );
}

console.log(
  `Runtime readiness passed for ${payload.environment}: database and migrations ready; Redis ${
    payload.redis_required ? "reachable" : "not required"
  }.`
);
