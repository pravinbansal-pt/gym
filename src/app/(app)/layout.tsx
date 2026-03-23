import { redirect } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TopBar } from "@/components/top-bar"
import { getSession } from "@/lib/get-session"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/signin")
  if (!session.user.username) redirect("/onboarding")

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: session.user.name ?? session.user.username,
          username: session.user.username,
          image: session.user.image ?? null,
        }}
      />
      <SidebarInset>
        <TopBar />
        <main className="flex-1 p-3 md:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
