"use server"

import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/get-session"
import { validateUsername } from "@/lib/username-validation"

export type UsernameFormState = {
  error?: string
  success?: boolean
}

export async function setUsername(
  _prev: UsernameFormState,
  formData: FormData
): Promise<UsernameFormState> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: "Not authenticated" }
  }

  const raw = formData.get("username")
  if (typeof raw !== "string") {
    return { error: "Username is required" }
  }

  const username = raw.trim()
  const validation = validateUsername(username)
  if (!validation.valid) {
    return { error: validation.error }
  }

  const lower = username.toLowerCase()

  const existing = await db.user.findUnique({
    where: { username: lower },
  })
  if (existing && existing.id !== session.user.id) {
    return { error: "This username is already taken" }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { username: lower },
  })

  redirect("/")
}
