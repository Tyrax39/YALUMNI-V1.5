const apiBaseUrl = (process.env.RELEASE_API_URL ?? "http://127.0.0.1:8002").replace(/\/$/, "");
const expectedEnvironment = process.env.RELEASE_EXPECTED_ENVIRONMENT;
const readinessUrl = `${apiBaseUrl}/api/v1/system/readiness`;
let response;

try {
  response = await fetch(readinessUrl, { signal: AbortSignal.timeout(15_000) });
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  throw new Error(`Runtime readiness could not reach ${readinessUrl}: ${detail}`);
}

const responseBody = await response.text();
const payload = (() => {
  try {
    return JSON.parse(responseBody);
  } catch {
    return {};
  }
})();

if (!response.ok) {
  throw new Error(
    `Runtime readiness failed with ${response.status}: ${
      Object.keys(payload).length ? JSON.stringify(payload) : responseBody || "empty response"
    }`
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
