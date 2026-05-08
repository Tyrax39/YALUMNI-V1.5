const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3010").replace(/\/$/, "");

const routes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/dashboard",
  "/onboarding",
  "/profile/setup",
  "/profile/program-affiliation",
  "/verification",
  "/verification/submitted",
  "/directory",
  "/directory/demo-user",
  "/communities",
  "/communities/demo-community",
  "/communities/demo-community/dashboard",
  "/messages",
  "/messages/new",
  "/messages/demo-conversation",
  "/messages/introductions",
  "/initiatives",
  "/initiatives/new",
  "/initiatives/demo-initiative",
  "/events",
  "/events/new",
  "/events/demo-event",
  "/events/demo-event/agenda",
  "/events/demo-event/attendees",
  "/opportunities",
  "/opportunities/new",
  "/opportunities/demo-opportunity",
  "/mentorship",
  "/mentorship/find",
  "/mentorship/request",
  "/mentorship/settings",
  "/resources",
  "/resources/new",
  "/resources/demo-resource",
  "/success-stories",
  "/success-stories/new",
  "/success-stories/demo-story",
  "/contributions",
  "/contributions/demo-campaign",
  "/contributions/demo-campaign/pay",
  "/contributions/receipts/demo-receipt",
  "/elections",
  "/elections/new",
  "/elections/demo-election",
  "/elections/demo-election/vote",
  "/elections/demo-election/results",
  "/admin",
  "/admin/verification",
  "/admin/moderation",
  "/admin/opportunities",
  "/admin/resources",
  "/admin/success-stories",
  "/admin/elections",
  "/admin/elections/new",
  "/admin/elections/demo-election",
  "/admin/elections/demo-election/candidates",
  "/admin/elections/demo-election/voter-roll",
  "/admin/elections/demo-election/privacy",
  "/admin/elections/demo-election/audit",
  "/admin/chapters",
  "/admin/chapters/demo-chapter/analytics",
  "/admin/treasury"
];

const failures = [];

for (const route of routes) {
  const response = await fetch(`${baseUrl}${route}`, {
    headers: {
      accept: "text/html"
    },
    redirect: "manual"
  });

  const isRedirect = response.status >= 300 && response.status < 400;
  if (!isRedirect && response.status >= 400) {
    failures.push(`${route} returned ${response.status}`);
    continue;
  }

  console.log(`${response.status} ${route}`);
}

if (failures.length > 0) {
  console.error("\nRoute smoke failures:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`\nChecked ${routes.length} routes at ${baseUrl}.`);
