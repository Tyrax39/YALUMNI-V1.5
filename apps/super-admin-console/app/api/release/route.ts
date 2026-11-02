import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "superadmin",
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
    commit_sha: process.env.YALUMNI_RELEASE_SHA ?? process.env.SOURCE_VERSION ?? null,
    release_version: process.env.YALUMNI_RELEASE_VERSION ?? null
  });
}
