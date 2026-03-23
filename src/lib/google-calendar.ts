import { db } from "@/lib/db"

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const CALENDAR_API = "https://www.googleapis.com/calendar/v3"

interface GoogleTokens {
  accessToken: string
  refreshToken: string
}

// ─── Token Management ───────────────────────────────────────────────

export async function getGoogleTokens(userId: string): Promise<GoogleTokens | null> {
  const account = await db.account.findFirst({
    where: { userId, provider: "google" },
    select: {
      access_token: true,
      refresh_token: true,
      expires_at: true,
      id: true,
    },
  })

  if (!account?.refresh_token) return null

  // Check if token is expired (with 5 min buffer)
  const isExpired = account.expires_at
    ? account.expires_at < Math.floor(Date.now() / 1000) + 300
    : true

  if (isExpired) {
    const refreshed = await refreshAccessToken(account.refresh_token)
    if (!refreshed) return null

    // Update stored tokens
    await db.account.update({
      where: { id: account.id },
      data: {
        access_token: refreshed.access_token,
        expires_at: refreshed.expires_at,
      },
    })

    return {
      accessToken: refreshed.access_token,
      refreshToken: account.refresh_token,
    }
  }

  return {
    accessToken: account.access_token!,
    refreshToken: account.refresh_token,
  }
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_at: number } | null> {
  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    return {
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    }
  } catch {
    return null
  }
}

// ─── Calendar API ───────────────────────────────────────────────────

async function calendarFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(`${CALENDAR_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
}

export async function createGoogleCalendar(
  tokens: GoogleTokens,
): Promise<string | null> {
  try {
    const res = await calendarFetch("/calendars", tokens.accessToken, {
      method: "POST",
      body: JSON.stringify({
        summary: "Gym Workouts",
        description: "Scheduled workouts from Gym Tracker",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    return data.id
  } catch {
    return null
  }
}

export async function createCalendarEvent(
  tokens: GoogleTokens,
  calendarId: string,
  workout: { name: string; exercises: string[]; date: string },
): Promise<string | null> {
  try {
    const description = workout.exercises.length > 0
      ? `Exercises:\n${workout.exercises.map((e) => `• ${e}`).join("\n")}`
      : undefined

    const res = await calendarFetch(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      tokens.accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          summary: workout.name,
          description,
          start: { date: workout.date },
          end: { date: workout.date },
        }),
      },
    )

    if (!res.ok) return null
    const data = await res.json()
    return data.id
  } catch {
    return null
  }
}

export async function updateCalendarEvent(
  tokens: GoogleTokens,
  calendarId: string,
  eventId: string,
  newDate: string,
): Promise<boolean> {
  try {
    const res = await calendarFetch(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      tokens.accessToken,
      {
        method: "PATCH",
        body: JSON.stringify({
          start: { date: newDate },
          end: { date: newDate },
        }),
      },
    )
    return res.ok
  } catch {
    return false
  }
}

export async function deleteCalendarEvent(
  tokens: GoogleTokens,
  calendarId: string,
  eventId: string,
): Promise<boolean> {
  try {
    const res = await calendarFetch(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      tokens.accessToken,
      { method: "DELETE" },
    )
    return res.ok || res.status === 404
  } catch {
    return false
  }
}

export async function deleteGoogleCalendar(
  tokens: GoogleTokens,
  calendarId: string,
): Promise<boolean> {
  try {
    const res = await calendarFetch(
      `/calendars/${encodeURIComponent(calendarId)}`,
      tokens.accessToken,
      { method: "DELETE" },
    )
    return res.ok || res.status === 404
  } catch {
    return false
  }
}
