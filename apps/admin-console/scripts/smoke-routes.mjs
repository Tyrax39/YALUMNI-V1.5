const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3011";

const routes = [
  "/login",
  "/",
  "/verification",
  "/moderation",
  "/opportunities",
  "/resources",
  "/success-stories",
  "/elections",
  "/treasury",
  "/contributions",
  "/chapters"
];

const results = [];

for (const route of routes) {
  const response = await fetch(`${baseUrl}${route}`, {
    redirect: "manual"
  });
  results.push({ route, status: response.status });
}

const failures = results.filter((result) => result.status >= 400);

for (const result of results) {
  console.log(`${result.status} ${result.route}`);
}

if (failures.length) {
  console.error("Admin smoke route failures:", failures);
  process.exit(1);
}
