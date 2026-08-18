"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { ThemeProvider } from "@/components/theme-provider"
import { NavigationMenuDemo } from "@/components/navigation-menu-demo"
import { AccountDropdown } from "@/components/account-dropdown"
import { ModeToggle } from "@/components/mode-toggle"
import { BrandLink } from "@/components/brand-link"
import { Footer } from "@/components/footer"

const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 Menit

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === "/login"
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null)

  // 1. Session & Idle Activity Check
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

    // Check Authentication & Timeout
    const checkAuthStatus = () => {
      try {
        const auth = localStorage.getItem("saguru_is_authenticated")
        const lastActivityStr = localStorage.getItem("saguru_last_activity")
        const now = Date.now()

        if (auth !== "true") {
          setIsAuthenticated(false)
          router.push("/login")
          return
        }

        // Check if 30 minutes of inactivity has passed
        if (lastActivityStr) {
          const lastActivity = Number(lastActivityStr)
          if (!isNaN(lastActivity) && now - lastActivity > IDLE_TIMEOUT_MS) {
            // Sesi kedaluwarsa karena tidak ada aktivitas selama 30 menit
            localStorage.removeItem("saguru_is_authenticated")
            localStorage.removeItem("saguru_last_activity")
            setIsAuthenticated(false)
            router.push("/login?reason=timeout")
            return
          }
        }

        // Sesi aktif
        setIsAuthenticated(true)
        if (!lastActivityStr) {
          localStorage.setItem("saguru_last_activity", now.toString())
        }
      } catch (err) {
        setIsAuthenticated(false)
        router.push("/login")
      }
    }

    checkAuthStatus()

    // Activity tracking listener (throttled)
    let lastRecorded = Date.now()
    const handleUserActivity = () => {
      const now = Date.now()
      if (now - lastRecorded > 5000) { // Update paling cepat setiap 5 detik
        lastRecorded = now
        try {
          if (localStorage.getItem("saguru_is_authenticated") === "true") {
            localStorage.setItem("saguru_last_activity", now.toString())
          }
        } catch {}
      }
    }

    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"]
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true })
    })

    // Interval checker every 15 seconds & on tab visibility change
    const intervalId = setInterval(checkAuthStatus, 15000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAuthStatus()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity)
      })
      clearInterval(intervalId)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
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

      <div className="flex-1 font-sans">{children}</div>

      <Footer />
    </ThemeProvider>
  )
}
