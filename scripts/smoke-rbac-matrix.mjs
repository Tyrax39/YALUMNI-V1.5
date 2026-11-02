const memberBaseUrl = (process.env.SMOKE_MEMBER_URL ?? "http://127.0.0.1:3010").replace(/\/$/, "");
const adminBaseUrl = (process.env.SMOKE_ADMIN_URL ?? "http://127.0.0.1:3011").replace(/\/$/, "");
const superAdminBaseUrl = (process.env.SMOKE_SUPERADMIN_URL ?? "http://127.0.0.1:3012").replace(/\/$/, "");
const password = process.env.SMOKE_RBAC_MATRIX_PASSWORD;

if (!password) {
  throw new Error("SMOKE_RBAC_MATRIX_PASSWORD is required for the RBAC matrix smoke test");
}

const accounts = {
  applicant: {
    email: process.env.SMOKE_RBAC_APPLICANT_EMAIL ?? "qa.applicant2@yalumni.org",
    role: "UNVERIFIED_USER"
  },
  member: {
    email: process.env.SMOKE_RBAC_MEMBER_EMAIL ?? "qa.member1@yalumni.org",
    role: "ALUMNI_MEMBER"
  },
  superAdmin: {
    email: process.env.SMOKE_RBAC_SUPERADMIN_EMAIL ?? "qa.superadmin@yalumni.org",
    role: "SUPER_ADMIN"
  },
  verifier: {
    email: process.env.SMOKE_RBAC_VERIFIER_EMAIL ?? "qa.verifier@yalumni.org",
    role: "VERIFICATION_ADMIN"
  }
};

class CookieJar {
  cookies = new Map();

  header() {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  store(response) {
    for (const cookie of getSetCookies(response.headers)) {
      const [pair] = cookie.split(";", 1);
      const separator = pair.indexOf("=");
      if (separator <= 0) {
        continue;
      }
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      if (value) {
        this.cookies.set(name, value);
      } else {
        this.cookies.delete(name);
      }
    }
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getSetCookies(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const value = headers.get("set-cookie");
  return value ? value.split(/,(?=\s*[^;,]+=)/g) : [];
}

async function request(baseUrl, path, options = {}, jar = new CookieJar()) {
  const headers = new Headers(options.headers ?? {});
  const cookie = jar.header();
  if (cookie) {
    headers.set("cookie", cookie);
  }
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(20_000)
  });
  jar.store(response);
  return response;
}

async function login(baseUrl, account) {
  const jar = new CookieJar();
  const csrfResponse = await request(baseUrl, "/api/session/csrf", {}, jar);
  assert(csrfResponse.status === 200, `${account.email} CSRF request returned ${csrfResponse.status}`);
  const csrf = await csrfResponse.json();
  assert(typeof csrf.csrf_token === "string", `${account.email} CSRF token missing`);

  const loginResponse = await request(
    baseUrl,
    "/api/session/login",
    {
      body: JSON.stringify({ email: account.email, password }),
      headers: { "content-type": "application/json", "x-csrf-token": csrf.csrf_token },
      method: "POST"
    },
    jar
  );
  const payload = await loginResponse.json().catch(() => ({}));
  assert(loginResponse.status === 200, `${account.email} login returned ${loginResponse.status}`);
  assert(payload.user?.roles?.includes(account.role), `${account.email} is missing ${account.role}`);
  return jar;
}

async function assertAllowed(label, baseUrl, path, jar) {
  const response = await request(baseUrl, path, { headers: { accept: "text/html" } }, jar);
  assert(response.status === 200, `${label} expected 200 for ${path}, got ${response.status}`);
  console.log(`PASS ${label}: ${path} is allowed`);
}

async function assertRedirect(label, baseUrl, path, expectedPath, expectedQuery, jar) {
  const response = await request(baseUrl, path, { headers: { accept: "text/html" } }, jar);
  assert(response.status >= 300 && response.status < 400, `${label} expected redirect for ${path}, got ${response.status}`);
  const location = response.headers.get("location");
  assert(location, `${label} redirect for ${path} is missing Location`);
  const redirect = new URL(location, baseUrl);
  assert(redirect.pathname === expectedPath, `${label} redirected to ${redirect.pathname}, expected ${expectedPath}`);
  for (const [key, value] of Object.entries(expectedQuery)) {
    assert(redirect.searchParams.get(key) === value, `${label} redirect ${key} did not equal ${value}`);
  }
  console.log(`PASS ${label}: ${path} redirects to ${expectedPath}`);
}

await assertRedirect(
  "anonymous member visitor",
  memberBaseUrl,
  "/directory?focus=mentors",
  "/login",
  { next: "/directory?focus=mentors" }
);

const memberJar = await login(memberBaseUrl, accounts.member);
await assertAllowed("verified member", memberBaseUrl, "/directory", memberJar);
await assertRedirect(
  "verified member",
  memberBaseUrl,
  "/admin/verification",
  "/dashboard",
  { denied: "admin" },
  memberJar
);

const memberAdminJar = await login(adminBaseUrl, accounts.member);
await assertRedirect(
  "verified member on admin console",
  adminBaseUrl,
  "/verification",
  "/login",
  { next: "/verification", reason: "admin-role-required" },
  memberAdminJar
);

const verifierJar = await login(adminBaseUrl, accounts.verifier);
await assertAllowed("verification admin", adminBaseUrl, "/verification", verifierJar);

const verifierSuperAdminJar = await login(superAdminBaseUrl, accounts.verifier);
await assertRedirect(
  "verification admin on super-admin console",
  superAdminBaseUrl,
  "/roles",
  "/login",
  { next: "/roles", reason: "super-admin-role-required" },
  verifierSuperAdminJar
);

const applicantJar = await login(memberBaseUrl, accounts.applicant);
await assertAllowed("unverified applicant", memberBaseUrl, "/dashboard", applicantJar);
await assertRedirect(
  "unverified applicant",
  memberBaseUrl,
  "/directory",
  "/verification",
  { denied: "member-workspace" },
  applicantJar
);

const superAdminAdminJar = await login(adminBaseUrl, accounts.superAdmin);
await assertAllowed("super admin on admin console", adminBaseUrl, "/moderation", superAdminAdminJar);

const superAdminJar = await login(superAdminBaseUrl, accounts.superAdmin);
await assertAllowed("super admin on super-admin console", superAdminBaseUrl, "/roles", superAdminJar);

console.log("RBAC matrix smoke checks passed.");
