import { Filter } from "bad-words"

const filter = new Filter()

const RESERVED_USERNAMES = [
  "admin",
  "administrator",
  "root",
  "system",
  "mod",
  "moderator",
  "support",
  "help",
  "info",
  "null",
  "undefined",
  "api",
  "signin",
  "signout",
  "login",
  "logout",
  "register",
  "onboarding",
  "settings",
  "profile",
  "dashboard",
  "exercises",
  "programs",
  "workouts",
  "about",
  "contact",
  "terms",
  "privacy",
  "gym",
  "gymtracker",
  "official",
  "staff",
  "bot",
  "test",
]

function decodeLeetspeak(str: string): string {
  return str
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/@/g, "a")
}

export function validateUsername(username: string): {
  valid: boolean
  error?: string
} {
  if (!username || !username.trim()) {
    return { valid: false, error: "Username is required" }
  }

  if (username.length < 4) {
    return { valid: false, error: "Username must be at least 4 characters" }
  }

  if (username.length > 20) {
    return { valid: false, error: "Username must be 20 characters or fewer" }
  }

  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    return { valid: false, error: "Only letters and numbers are allowed" }
  }

  const lower = username.toLowerCase()

  if (RESERVED_USERNAMES.includes(lower)) {
    return { valid: false, error: "This username is not available" }
  }

  const decoded = decodeLeetspeak(lower)
  if (filter.isProfane(username) || filter.isProfane(decoded) || filter.isProfane(lower)) {
    return { valid: false, error: "This username is not allowed" }
  }

  return { valid: true }
}
