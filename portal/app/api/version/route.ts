import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "portal",
    service_version: process.env.SERVICE_VERSION ?? "1.1.0",
    platform_version: process.env.PLATFORM_VERSION ?? "1.1.0",
    api_version: "v1",
  });
}
