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
import { createSessionAccessGate } from "@/lib/session-access"
import { hasTeacherAccess } from "@/lib/services/authService"
import { supabase } from "@/lib/supabase"
import { AppSidebar } from "@/components/app-sidebar"
import { cn } from "@/lib/utils"

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === "/login"
  const isMigrasiPage = pathname === "/migrasi-data"
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null)

  const [accessError, setAccessError] = React.useState("")

  const accessGate = React.useRef(createSessionAccessGate())

  React.useEffect(() => {
    const gate = accessGate.current
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = gate.begin(session?.user.id ?? null)
      if (!active) return
      clearTimeout(timer)
      if (!session) {
        setIsAuthenticated(false)
        setAccessError("")
        if (!isLoginPage) router.replace("/login")
        return
      }
      if (!current.keepMounted) {
        setIsAuthenticated(false)
      }
      // Run outside the auth callback to avoid holding the auth client's lock.
      timer = setTimeout(async () => {
        try {
          const allowed = await hasTeacherAccess(session.user.id)
          if (!active || !current.isCurrent()) return
          current.resolve(allowed)
          setIsAuthenticated(allowed)
          setAccessError(allowed ? "" : "Akun Anda belum diberi akses guru.")
        } catch {
          if (active && current.isCurrent()) setAccessError("Tidak dapat memeriksa akses. Periksa koneksi lalu muat ulang halaman.")
        }
      }, 0)
    })
    return () => { active = false; gate.invalidate(); clearTimeout(timer); subscription.unsubscribe() }
  }, [isLoginPage, router])

  React.useEffect(() => {
    if (isLoginPage || isMigrasiPage) {
      document.documentElement.classList.add("overflow-hidden")
      document.body.classList.add("overflow-hidden")
      return () => {
        document.documentElement.classList.remove("overflow-hidden")
        document.body.classList.remove("overflow-hidden")
      }
    }
  }, [isLoginPage, isMigrasiPage])

  if (isLoginPage) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div className="fixed inset-0 h-dvh w-screen overflow-hidden bg-gradient-to-br from-[#4274D9] via-[#3768c8] to-[#214b9c] dark:from-[#122c57] dark:via-[#102344] dark:to-[#0b172e] text-foreground flex flex-col justify-center items-center font-sans overscroll-none select-none">
          {children}
        </div>
      </ThemeProvider>
    )
  }

  if (isAuthenticated !== true) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <p role="status">{accessError || "Memeriksa akses akun..."}</p>
      {accessError && <a href="/login" className="underline">Kembali ke halaman masuk</a>}
    </div>
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
        <div className={cn("flex-1 flex flex-col w-full", isMigrasiPage ? "h-screen overflow-hidden" : "min-h-screen")}>
          <header className="sticky top-0 z-50 w-full border-b border-blue-400/30 bg-[#4274D9] text-white dark:bg-[#0F172A] dark:text-[#60A5FA] dark:border-[#1E293B] backdrop-blur-md px-3 sm:px-6 py-2 sm:py-2.5 lg:py-3 flex items-center justify-between transition-colors duration-200">
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

          {accessError && <p role="alert" className="p-3 text-sm bg-amber-100 text-amber-950">{accessError} Isian Anda tetap terbuka; penyimpanan tetap memerlukan izin server.</p>}
          <main className={cn("flex-1 font-sans", isMigrasiPage && "overflow-hidden flex flex-col")}>{children}</main>

          {!isMigrasiPage && <Footer />}
        </div>
      </SidebarProvider>
    </ThemeProvider>
  )
}
