const memberBaseUrl = (process.env.SMOKE_MEMBER_URL ?? "http://127.0.0.1:3010").replace(/\/$/, "");
const adminBaseUrl = (process.env.SMOKE_ADMIN_URL ?? "http://127.0.0.1:3011").replace(/\/$/, "");
const superAdminBaseUrl = (process.env.SMOKE_SUPERADMIN_URL ?? "http://127.0.0.1:3012").replace(/\/$/, "");

const superAdminEmail = process.env.SMOKE_SUPERADMIN_EMAIL;
const superAdminPassword = process.env.SMOKE_SUPERADMIN_PASSWORD;
const superAdminJars = new Map();

class CookieJar {
  cookies = new Map();

  header() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  store(response) {
    for (const cookie of getSetCookies(response.headers)) {
      const [pair] = cookie.split(";");
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

function getSetCookies(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const header = headers.get("set-cookie");
  if (!header) {
    return [];
  }

  return header.split(/,(?=\s*[^;,]+=)/g);
}

async function request(baseUrl, path, options = {}, jar = new CookieJar()) {
  const headers = new Headers(options.headers ?? {});
  const cookieHeader = jar.header();
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    redirect: "manual"
  });
  jar.store(response);

  return response;
}

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertAnonymousApiIsBlocked(baseUrl, label) {
  const response = await request(baseUrl, "/api/backend/api/v1/auth/me");
  assert(response.status === 401, `${label} anonymous /auth/me should return 401, got ${response.status}`);
  console.log(`ok anonymous blocked on ${label}`);
}

async function assertPublicNavIsClean() {
  const response = await request(
    memberBaseUrl,
    "/",
    {
      headers: { accept: "text/html" }
    },
    new CookieJar()
  );
  assert(response.status === 200, `member public home should render, got ${response.status}`);
  const html = await response.text();
  const forbiddenLabels = ["Directory", "Elections", "Messages", "Communities", "Contributions"];
  for (const label of forbiddenLabels) {
    assert(!html.includes(`>${label}<`), `public member header should not expose ${label}`);
  }
  console.log("ok public nav hides member-only labels");
}

async function login(baseUrl, email, password) {
  const jar = new CookieJar();
  const csrfResponse = await request(baseUrl, "/api/session/csrf", {}, jar);
  assert(csrfResponse.status === 200, `csrf request failed on ${baseUrl}: ${csrfResponse.status}`);
  const csrf = await readJson(csrfResponse);
  assert(typeof csrf.csrf_token === "string", `csrf token missing on ${baseUrl}`);

  const response = await request(
    baseUrl,
    "/api/session/login",
    {
      body: JSON.stringify({ email, password }),
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrf.csrf_token
      },
      method: "POST"
    },
    jar
  );
  assert(response.status === 200, `login failed on ${baseUrl}: ${response.status}`);

  return jar;
}

async function loginSuperAdmin(baseUrl) {
  if (!superAdminJars.has(baseUrl)) {
    superAdminJars.set(baseUrl, await login(baseUrl, superAdminEmail, superAdminPassword));
  }

  return superAdminJars.get(baseUrl);
}

async function assertSuperAdminAccess(baseUrl, label, expectedRoute) {
  const jar = await loginSuperAdmin(baseUrl);
  const meResponse = await request(baseUrl, "/api/backend/api/v1/auth/me", {}, jar);
  assert(meResponse.status === 200, `${label} /auth/me should return 200, got ${meResponse.status}`);
  const me = await readJson(meResponse);
  assert(Array.isArray(me.roles), `${label} user roles missing`);
  assert(me.roles.includes("SUPER_ADMIN"), `${label} user must include SUPER_ADMIN role`);
  assert(me.roles.includes("ALUMNI_MEMBER"), `${label} user must include ALUMNI_MEMBER role`);

  const routeResponse = await request(
    baseUrl,
    expectedRoute,
    {
      headers: { accept: "text/html" }
    },
    jar
  );
  assert(routeResponse.status < 400, `${label} route ${expectedRoute} failed with ${routeResponse.status}`);
  console.log(`ok super admin can access ${label} ${expectedRoute}`);
}

await assertPublicNavIsClean();
await assertAnonymousApiIsBlocked(memberBaseUrl, "member app");
await assertAnonymousApiIsBlocked(adminBaseUrl, "admin console");
await assertAnonymousApiIsBlocked(superAdminBaseUrl, "super-admin console");

if (!superAdminEmail || !superAdminPassword) {
  console.log("skipping credentialed super-admin checks; set SMOKE_SUPERADMIN_EMAIL and SMOKE_SUPERADMIN_PASSWORD");
  process.exit(0);
}

await assertSuperAdminAccess(memberBaseUrl, "member app", "/dashboard");
await assertSuperAdminAccess(adminBaseUrl, "admin console", "/verification");
await assertSuperAdminAccess(adminBaseUrl, "admin console", "/moderation");
await assertSuperAdminAccess(superAdminBaseUrl, "super-admin console", "/roles");

console.log("RBAC smoke checks passed.");
