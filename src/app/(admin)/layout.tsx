import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  console.log("Admin Layout - Session:", JSON.stringify(session, null, 2))

  // Redirect to login if not authenticated
  if (!session) {
    redirect("/login-admin")
  }

  // Check for admin type
  const userType = (session.user as any)?.type
  console.log("Admin Layout - User type:", userType)

  if (userType !== "admin") {
    redirect("/login-admin")
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-gray-50/50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
