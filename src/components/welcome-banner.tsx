"use client"

import { useState, useEffect } from "react"
import { Minus, X } from "lucide-react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

import { getBannerTimeInfo, type BannerTimeInfo } from "@/lib/school-date"

export function WelcomeBanner() {
  const [isClosed, setIsClosed] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [timeInfo, setTimeInfo] = useState<BannerTimeInfo | null>(null)

  // Jam lokal berdetik setiap detik (tanpa request server)
  useEffect(() => {
    const updateTime = () => {
      setTimeInfo(getBannerTimeInfo(new Date()))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateTime()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  // Listener untuk memunculkan kembali banner saat kata "SAGURU" diklik di header
  useEffect(() => {
    const handleShowBanner = () => {
      setIsClosed(false)
      setIsMinimized(false)
    }
    window.addEventListener("show-welcome-banner", handleShowBanner)
    return () => window.removeEventListener("show-welcome-banner", handleShowBanner)
  }, [])

  if (isClosed) return null

  return (
    <div className="w-full max-w-5xl lg:max-w-6xl mx-auto my-3 sm:my-6 px-3 sm:px-6">
      <div className="relative overflow-hidden rounded-md border border-border border-t-4 border-t-emerald-600 dark:border-t-emerald-500 bg-card text-card-foreground shadow-xs transition-all duration-200">
        
        {/* Header Bar dengan Judul Tengah & Tombol Aksi Kanan */}
        <div className="relative flex items-center justify-between px-4 py-3 sm:px-6 border-b border-border/40 bg-card z-20">
          {/* Judul Tepat Di Tengah */}
          <div className="flex-1 px-12 text-center font-semibold text-sm sm:text-lg text-foreground/90">
            Selamat datang di SAGURU
          </div>

          {/* Tombol Aksi Kanan (-) dan (x) */}
          <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-muted-foreground z-30">
            {/* HoverCard khusus Desktop pada tombol (-) */}
            <HoverCard>
              <HoverCardTrigger
                delay={10}
                closeDelay={100}
                render={
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="p-1 hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer"
                    title={isMinimized ? "Klik untuk informasi" : "Ciutkan banner"}
                  >
                    <Minus className="h-4 w-4 stroke-[2.5]" />
                    <span className="sr-only">
                      {isMinimized ? "Klik untuk informasi" : "Minimalkan"}
                    </span>
                  </button>
                }
              />
              <HoverCardContent
                side="top"
                align="end"
                className="hidden lg:flex w-56 flex-col gap-1 p-3 text-xs bg-popover border border-border shadow-md"
              >
                <div className="font-semibold text-foreground">
                  {isMinimized ? "Klik untuk informasi" : "Ciutkan banner untuk area kerja lebih luas."}
                </div>
                <div className="text-muted-foreground leading-normal">
                  {isMinimized
                    ? "Klik untuk memunculkan kembali informasi banner."
                    : "Klik untuk menciutkan banner agar tampilan area kerja Anda menjadi lebih luas."}
                </div>
              </HoverCardContent>
            </HoverCard>

            <button
              onClick={() => setIsClosed(true)}
              className="p-1 hover:text-destructive hover:bg-muted rounded transition-colors cursor-pointer"
              title="Tutup Banner"
            >
              <X className="h-4 w-4 stroke-[2.5]" />
              <span className="sr-only">Tutup</span>
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 px-4 py-5 text-center text-xs font-medium sm:px-12 sm:text-sm">
            {timeInfo ? (
              <>
                <div className="font-semibold text-foreground/90">{timeInfo.line1}</div>
                <div className="max-w-full text-foreground/80 font-normal tabular-nums">{timeInfo.line2}</div>
              </>
            ) : (
              <div role="status" className="w-full max-w-72 space-y-2">
                <span className="sr-only">Memuat waktu…</span>
                <div className="mx-auto h-4 w-4/5 animate-pulse rounded bg-muted/80" />
                <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
