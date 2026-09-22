"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCalendarDays } from "@fortawesome/free-solid-svg-icons"
import { Card, CardContent } from "@/components/ui/card"
import GlareHover from "@/components/glare-hover"
import { JADWAL_BU_DEVY, getEffectiveScheduleDay } from "@/lib/data-jadwal"

const QuickActionsSchedule = () => {
  const [scheduleData, setScheduleData] = useState<{
    dayName: string
    isUpcoming: boolean
    sessionsCount: number
    ruanganSummary: string
    statusMessage?: string
  } | null>(null)

  useEffect(() => {
    const updateSchedule = () => {
      const info = getEffectiveScheduleDay()
      const activeSessions = JADWAL_BU_DEVY.filter(
        (item) => item.hari === info.dayName && !item.isBreak
      )
      const uniqueRuangan = Array.from(new Set(activeSessions.map((s) => s.ruangan).filter((r) => r && r !== "-")))

      setScheduleData({
        dayName: info.dayName,
        isUpcoming: info.isUpcoming,
        sessionsCount: activeSessions.length,
        ruanganSummary: uniqueRuangan.length > 0 ? uniqueRuangan.join(" • ") : "Ruang 9A • Ruang 9B",
        statusMessage: info.statusMessage,
      })
    }
    const initial = window.setTimeout(updateSchedule, 0)
    const timer = window.setInterval(updateSchedule, 60_000)
    return () => { window.clearTimeout(initial); window.clearInterval(timer) }
  }, [])

  const subtext = !scheduleData ? "Memuat jadwal…" : scheduleData.statusMessage || (scheduleData.isUpcoming
    ? `Tatap Muka Mendatang: ${scheduleData.ruanganSummary}`
    : `Jadwal Hari Ini: ${scheduleData.ruanganSummary}`)

  return (
    <div className="max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 w-full">
      <Card className="p-0 border border-border shadow-xs overflow-hidden bg-card text-card-foreground">
        <CardContent className="p-0">
          <Link href="/jadwal" className="block w-full group focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary">
            <GlareHover
              className="w-full hover:bg-muted/60 dark:hover:bg-muted/40 transition-colors"
              glareColor="#ffffff"
              glareOpacity={0.75}
              glareAngle={45}
              glareSize={200}
              transitionDuration={700}
            >
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-5">
                <div className="flex min-w-0 items-center gap-3 sm:flex-1">
                  <div className="shrink-0 transition-transform duration-200 hover:scale-110">
                    <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" style={{ color: "rgb(116, 192, 252)", width: 26, height: 26 }} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-foreground sm:text-base">Jadwal Bu Devy</h2>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subtext}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border/60 pt-3 sm:justify-end sm:border-t-0 sm:pt-0">
                  <div className="sm:border-l sm:border-border/60 sm:pl-6">
                    <p className="text-lg font-semibold leading-tight text-foreground sm:text-xl">{scheduleData ? `${scheduleData.sessionsCount} sesi` : "—"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{scheduleData?.dayName || "Memuat…"}</p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-[#4274D9] group-hover:underline dark:text-[#74c0fc]">
                    Lihat jadwal <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
                  </span>
                </div>
              </div>
            </GlareHover>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default QuickActionsSchedule
