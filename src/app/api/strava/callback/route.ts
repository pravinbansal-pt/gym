import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  // Validate CSRF state token
  const cookieStore = await cookies();
  const savedState = cookieStore.get("strava_oauth_state")?.value;
  cookieStore.delete("strava_oauth_state");

  if (!savedState || !state || state !== savedState) {
    const redirectUrl = new URL("/settings", request.url);
    redirectUrl.searchParams.set("strava", "error");
    return NextResponse.redirect(redirectUrl);
  }

  if (error || !code) {
    const redirectUrl = new URL("/settings", request.url);
    redirectUrl.searchParams.set("strava", "error");
    return NextResponse.redirect(redirectUrl);
  }

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const redirectUrl = new URL("/settings", request.url);
    redirectUrl.searchParams.set("strava", "error");
    return NextResponse.redirect(redirectUrl);
  }

  const data = await tokenRes.json();

  if (!data.athlete?.id || !data.access_token || !data.refresh_token || !data.expires_at) {
    const redirectUrl = new URL("/settings", request.url);
    redirectUrl.searchParams.set("strava", "error");
    return NextResponse.redirect(redirectUrl);
  }

  await db.stravaConnection.upsert({
    where: { id: "default" },
    update: {
      stravaAthleteId: data.athlete.id,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at * 1000),
      scope: "activity:read_all",
    },
    create: {
      id: "default",
      stravaAthleteId: data.athlete.id,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at * 1000),
      scope: "activity:read_all",
    },
  });

  const redirectUrl = new URL("/settings", request.url);
  redirectUrl.searchParams.set("strava", "connected");
  return NextResponse.redirect(redirectUrl);
}
