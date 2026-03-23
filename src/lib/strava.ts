import { db } from "@/lib/db";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

export async function getStravaConnection() {
  return db.stravaConnection.findUnique({ where: { id: "default" } });
}

/** Refresh the token if it expires within the next 5 minutes */
export async function ensureFreshToken() {
  const connection = await getStravaConnection();
  if (!connection) throw new Error("Strava not connected");

  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (connection.expiresAt > fiveMinFromNow) {
    return connection;
  }

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token refresh failed: ${text}`);
  }

  const data = await res.json();

  const updated = await db.stravaConnection.update({
    where: { id: "default" },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at * 1000),
    },
  });

  return updated;
}

/** Make an authenticated request to the Strava API */
export async function stravaFetch(path: string, options?: RequestInit) {
  const connection = await ensureFreshToken();
  const res = await fetch(`${STRAVA_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava API error (${res.status}): ${text}`);
  }

  return res.json();
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  calories?: number;
  start_date: string;
  map?: { summary_polyline?: string };
  splits_metric?: Array<{
    distance: number;
    elapsed_time: number;
    moving_time: number;
    average_speed: number;
    average_heartrate?: number;
    elevation_difference: number;
    split: number;
  }>;
  laps?: unknown[];
  best_efforts?: Array<{
    name: string;
    distance: number;
    elapsed_time: number;
    moving_time: number;
  }>;
}

/** Fetch a page of activities from Strava */
export async function fetchActivities(params?: {
  after?: number;
  before?: number;
  page?: number;
  per_page?: number;
}): Promise<StravaActivity[]> {
  const searchParams = new URLSearchParams();
  if (params?.after) searchParams.set("after", String(params.after));
  if (params?.before) searchParams.set("before", String(params.before));
  searchParams.set("page", String(params?.page ?? 1));
  searchParams.set("per_page", String(params?.per_page ?? 30));

  return stravaFetch(`/athlete/activities?${searchParams.toString()}`);
}

/** Fetch detailed activity data (includes splits, laps, best efforts) */
export async function fetchActivityDetail(
  activityId: number
): Promise<StravaActivity> {
  return stravaFetch(`/activities/${activityId}`);
}
