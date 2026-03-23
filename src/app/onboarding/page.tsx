import { redirect } from "next/navigation"
import { getSession } from "@/lib/get-session"
import { UsernameForm } from "./_components/username-form"

export default async function OnboardingPage() {
  const session = await getSession()
  if (!session) redirect("/signin")
  if (session.user.username) redirect("/")

  return <UsernameForm />
}
