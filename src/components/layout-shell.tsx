"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { ThemeProvider } from "@/components/theme-provider"
import { NavigationMenuDemo } from "@/components/navigation-menu-demo"
import { AccountDropdown } from "@/components/account-dropdown"
import { ModeToggle } from "@/components/mode-toggle"
import { BrandLink } from "@/components/brand-link"
import { Footer } from "@/components/footer"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === "/login"
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    // Clear initial mock student data for testing stage
    try {
      const isCleared = localStorage.getItem("saguru_data_cleared_v2")
      if (!isCleared) {
        const emptyMap = { "9a": [], "9b": [], "8h": [], "8i": [] }
        localStorage.setItem("saguru_migrated_students", JSON.stringify(emptyMap))
        localStorage.setItem("saguru_tasks_list", JSON.stringify([]))
        localStorage.setItem("saguru_grades_matrix", JSON.stringify({}))
        localStorage.setItem("saguru_data_cleared_v2", "true")
        window.dispatchEvent(new Event("saguru-data-updated"))
        window.dispatchEvent(new Event("saguru-tasks-updated"))
      }
    } catch (err) {}

    if (isLoginPage) {
      setIsAuthenticated(true)
      return
    }

    try {
      const auth = localStorage.getItem("saguru_is_authenticated")
      if (auth === "true") {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
        router.push("/login")
      }
    } catch (err) {
      setIsAuthenticated(false)
      router.push("/login")
    }
  }, [pathname, isLoginPage, router])

  if (isLoginPage) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div className="min-h-screen w-full bg-[#4274D9] dark:bg-background text-foreground flex flex-col justify-center items-center font-sans">
          {children}
        </div>
      </ThemeProvider>
    )
  }

  if (isAuthenticated === false) {
    return null
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-screen w-full">
          <header className="sticky top-0 z-50 w-full border-b border-blue-400/30 bg-[#4274D9] text-white dark:bg-[#0F172A] dark:text-[#60A5FA] dark:border-[#1E293B] backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between transition-colors duration-200">
            {/* Desktop Left Brand "SAGURU" */}
            <div className="hidden lg:flex items-center">
              <BrandLink />
            </div>

            {/* Navigation Menu (Center desktop menu & Mobile trigger + Mobile center brand) */}
            <div className="flex-1 flex items-center justify-between lg:justify-center">
              <NavigationMenuDemo />
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3 shrink-0">
              <ModeToggle />
              <AccountDropdown />
            </div>
          </header>

          <main className="flex-1 font-sans">{children}</main>

          <Footer />
        </div>
      </SidebarProvider>
    </ThemeProvider>
  )
}
