import { auth } from "@/auth"
import { isAuthBypassed, getDevSession } from "@/lib/dev-auth"

export async function getSession() {
  if (isAuthBypassed()) {
    return getDevSession()
  }
  return auth()
}
