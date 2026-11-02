const apps = [
  {
    baseUrl: (process.env.SMOKE_MEMBER_URL ?? "http://127.0.0.1:3010").replace(/\/$/, ""),
    label: "member app",
    protectedPath: "/dashboard",
    requiredRole: "ALUMNI_MEMBER"
  },
  {
    baseUrl: (process.env.SMOKE_ADMIN_URL ?? "http://127.0.0.1:3011").replace(/\/$/, ""),
    label: "admin console",
    protectedPath: "/verification",
    requiredRole: "PLATFORM_ADMIN"
  },
  {
    baseUrl: (process.env.SMOKE_SUPERADMIN_URL ?? "http://127.0.0.1:3012").replace(/\/$/, ""),
    label: "super-admin console",
    protectedPath: "/roles",
    requiredRole: "SUPER_ADMIN"
  }
];

const email = process.env.SMOKE_AUTH_EMAIL;
const password = process.env.SMOKE_AUTH_PASSWORD;
const twoFactorCode = process.env.SMOKE_AUTH_TWO_FACTOR_CODE;
const twoFactorRecoveryCode = process.env.SMOKE_AUTH_TWO_FACTOR_RECOVERY_CODE;

if (!email || !password) {
  throw new Error("SMOKE_AUTH_EMAIL and SMOKE_AUTH_PASSWORD are required for auth-session smoke tests");
}

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

async function readJson(response, label) {
  const payload = await response.json().catch(() => ({}));
  assert(response.ok, `${label} returned ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
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

async function issueCsrf(app, jar) {
  const response = await request(app.baseUrl, "/api/session/csrf", {}, jar);
  const body = await readJson(response, `${app.label} CSRF request`);
  assert(typeof body.csrf_token === "string" && body.csrf_token.length > 0, `${app.label} CSRF token missing`);
  assert(jar.cookies.get("yalumni_csrf_token") === body.csrf_token, `${app.label} CSRF cookie mismatch`);
  const csrfCookie = getSetCookies(response.headers).find((cookie) => cookie.startsWith("yalumni_csrf_token="));
  assert(csrfCookie && !/httponly/i.test(csrfCookie), `${app.label} CSRF cookie must be readable by the client`);
  return body.csrf_token;
}

async function login(app) {
  const jar = new CookieJar();
  const csrfToken = await issueCsrf(app, jar);
  const payload = {
    email,
    password,
    ...(twoFactorCode ? { two_factor_code: twoFactorCode } : {}),
    ...(twoFactorRecoveryCode ? { two_factor_recovery_code: twoFactorRecoveryCode } : {})
  };
  const response = await request(
    app.baseUrl,
    "/api/session/login",
    {
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
      method: "POST"
    },
    jar
  );
  const body = await readJson(response, `${app.label} login`);
  assert(!("access_token" in body) && !("refresh_token" in body), `${app.label} login exposed backend tokens`);
  assert(Array.isArray(body.user?.roles), `${app.label} login response is missing user roles`);
  assert(body.user.roles.includes(app.requiredRole), `${app.label} account is missing ${app.requiredRole}`);
  assert(jar.cookies.get("yalumni_access_token"), `${app.label} access cookie missing`);
  assert(jar.cookies.get("yalumni_refresh_token"), `${app.label} refresh cookie missing`);
  const cookies = getSetCookies(response.headers);
  assert(
    cookies.some((cookie) => cookie.startsWith("yalumni_access_token=") && /httponly/i.test(cookie)),
    `${app.label} access cookie must be HttpOnly`
  );
  assert(
    cookies.some((cookie) => cookie.startsWith("yalumni_refresh_token=") && /httponly/i.test(cookie)),
    `${app.label} refresh cookie must be HttpOnly`
  );
  return { csrfToken, jar };
}

async function runForApp(app) {
  const initialCsrfJar = new CookieJar();
  await issueCsrf(app, initialCsrfJar);
  console.log(`PASS ${app.label}: CSRF issuance provides a readable same-origin token`);

  const anonymous = await request(app.baseUrl, "/api/backend/api/v1/auth/me");
  assert(anonymous.status === 401, `${app.label} anonymous session endpoint returned ${anonymous.status}`);
  console.log(`PASS ${app.label}: anonymous backend access is rejected`);

  const missingCsrf = await request(app.baseUrl, "/api/session/login", {
    body: JSON.stringify({ email: "csrf-missing@example.invalid", password: "not-used" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert(missingCsrf.status === 403, `${app.label} missing CSRF login returned ${missingCsrf.status}`);
  console.log(`PASS ${app.label}: missing CSRF is rejected`);

  const hostileJar = new CookieJar();
  const hostileCsrfToken = await issueCsrf(app, hostileJar);
  const hostileOrigin = await request(
    app.baseUrl,
    "/api/session/login",
    {
      body: JSON.stringify({ email: "origin-check@example.invalid", password: "not-used" }),
      headers: {
        "content-type": "application/json",
        origin: "https://untrusted.example.invalid",
        "x-csrf-token": hostileCsrfToken
      },
      method: "POST"
    },
    hostileJar
  );
  assert(hostileOrigin.status === 403, `${app.label} hostile-origin login returned ${hostileOrigin.status}`);
  console.log(`PASS ${app.label}: untrusted origin is rejected`);

  const { csrfToken, jar } = await login(app);
  console.log(`PASS ${app.label}: login is sanitized and cookie-backed`);

  const currentUser = await request(app.baseUrl, "/api/backend/api/v1/auth/me", {}, jar);
  const user = await readJson(currentUser, `${app.label} authenticated /auth/me`);
  assert(user.email === email, `${app.label} authenticated user email did not match`);
  assert(user.roles.includes(app.requiredRole), `${app.label} authenticated role did not match`);
  console.log(`PASS ${app.label}: authenticated backend proxy preserves identity`);

  const protectedPage = await request(
    app.baseUrl,
    app.protectedPath,
    { headers: { accept: "text/html" } },
    jar
  );
  assert(protectedPage.status === 200, `${app.label} protected page returned ${protectedPage.status}`);
  console.log(`PASS ${app.label}: protected route accepts the assigned role`);

  const refreshBefore = jar.cookies.get("yalumni_refresh_token");
  const refresh = await request(
    app.baseUrl,
    "/api/session/refresh",
    { headers: { "x-csrf-token": csrfToken }, method: "POST" },
    jar
  );
  await readJson(refresh, `${app.label} refresh`);
  assert(
    jar.cookies.get("yalumni_refresh_token") !== refreshBefore,
    `${app.label} refresh token did not rotate`
  );
  console.log(`PASS ${app.label}: refresh rotates the session token`);

  const logout = await request(
    app.baseUrl,
    "/api/session/logout",
    { headers: { "x-csrf-token": csrfToken }, method: "POST" },
    jar
  );
  assert(logout.status === 204, `${app.label} logout returned ${logout.status}`);
  assert(!jar.cookies.has("yalumni_access_token"), `${app.label} logout retained the access cookie`);
  assert(!jar.cookies.has("yalumni_refresh_token"), `${app.label} logout retained the refresh cookie`);
  assert(!jar.cookies.has("yalumni_csrf_token"), `${app.label} logout retained the CSRF cookie`);
  console.log(`PASS ${app.label}: logout clears session and CSRF cookies`);

  const afterLogout = await request(app.baseUrl, "/api/backend/api/v1/auth/me", {}, jar);
  assert(afterLogout.status === 401, `${app.label} backend access after logout returned ${afterLogout.status}`);
  console.log(`PASS ${app.label}: logout revokes browser-side access`);
}

for (const app of apps) {
  await runForApp(app);
}

console.log("Auth-session smoke checks passed across member, admin, and super-admin apps.");
