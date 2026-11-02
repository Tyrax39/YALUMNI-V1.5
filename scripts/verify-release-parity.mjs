const targets = [
  {
    service: "api",
    url: `${(process.env.RELEASE_API_URL ?? "http://127.0.0.1:8002").replace(/\/$/, "")}/release`
  },
  {
    service: "member",
    url: `${(process.env.RELEASE_MEMBER_URL ?? "http://127.0.0.1:3010").replace(/\/$/, "")}/api/release`
  },
  {
    service: "admin",
    url: `${(process.env.RELEASE_ADMIN_URL ?? "http://127.0.0.1:3011").replace(/\/$/, "")}/api/release`
  },
  {
    service: "superadmin",
    url: `${(process.env.RELEASE_SUPERADMIN_URL ?? "http://127.0.0.1:3012").replace(/\/$/, "")}/api/release`
  }
];

const identities = [];

for (const target of targets) {
  const response = await fetch(target.url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    throw new Error(`${target.service} release endpoint returned ${response.status}`);
  }

  const identity = await response.json();
  if (identity.service !== target.service) {
    throw new Error(`${target.service} endpoint reported service ${identity.service ?? "missing"}`);
  }
  if (!identity.commit_sha || !identity.release_version) {
    throw new Error(`${target.service} release identity is missing SHA or version`);
  }

  identities.push(identity);
  console.log(`${target.service}: ${identity.commit_sha} (${identity.release_version})`);
}

const expectedSha = process.env.RELEASE_EXPECTED_SHA ?? identities[0].commit_sha;
const expectedVersion = process.env.RELEASE_EXPECTED_VERSION ?? identities[0].release_version;
const mismatches = identities.filter(
  (identity) =>
    identity.commit_sha !== expectedSha || identity.release_version !== expectedVersion
);

if (mismatches.length) {
  throw new Error(
    `Release parity failed for: ${mismatches.map((identity) => identity.service).join(", ")}`
  );
}

console.log(`Release parity passed for all four services at ${expectedSha} (${expectedVersion}).`);
