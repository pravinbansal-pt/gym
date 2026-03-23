import { db } from "@/lib/db"

const DEV_USER_EMAIL = "dev@localhost"

export function isAuthBypassed() {
  return process.env.BYPASS_AUTH === "true" && process.env.NODE_ENV !== "production"
}

let devSessionCache: DevSession | null = null

interface DevSession {
  user: {
    id: string
    username: string | null
    name: string
    email: string
    image: null
  }
  expires: string
}

export async function getDevSession(): Promise<DevSession> {
  if (devSessionCache) return devSessionCache

  let user = await db.user.findUnique({ where: { email: DEV_USER_EMAIL } })

  if (!user) {
    user = await db.user.create({
      data: {
        email: DEV_USER_EMAIL,
        name: "Dev User",
        username: "devuser",
      },
    })
  }

  devSessionCache = {
    user: {
      id: user.id,
      username: user.username,
      name: user.name ?? "Dev User",
      email: user.email ?? DEV_USER_EMAIL,
      image: null,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }

  return devSessionCache
}
