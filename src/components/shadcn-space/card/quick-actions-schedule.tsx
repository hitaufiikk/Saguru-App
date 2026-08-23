"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Icon } from "@iconify/react"
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
  }>({
    dayName: "Senin",
    isUpcoming: false,
    sessionsCount: 5,
    ruanganSummary: "Ruang 9A • Ruang 9B • Ruang 8H • Ruang 8I",
  })

  useEffect(() => {
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
  }, [])

  const TeacherActions = [
    {
      title: "Jadwal Bu Devy",
      subtitle: `${scheduleData.sessionsCount} Sesi (${scheduleData.dayName})`,
      subtext: scheduleData.statusMessage || (scheduleData.isUpcoming
        ? `Tatap Muka Mendatang: ${scheduleData.ruanganSummary}`
        : `Jadwal Hari Ini: ${scheduleData.ruanganSummary}`),
      cardIcon: "solar:calendar-bold-duotone",
      href: "/jadwal",
    },
    {
      title: "Aksi Cepat",
      subtitle: "3 Akses Pintas",
      subtext: "Presensi 9A • Buat Tugas Baru • Upload Buku Digital",
      cardIcon: "solar:bolt-bold-duotone",
      href: "/presensi/9a",
    },
  ]

  return (
    <div className="max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 w-full">
      <Card className="p-0 border border-border shadow-xs overflow-hidden bg-card text-card-foreground">
        <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0">
          {TeacherActions.map((item, index) => {
            return (
              <Link key={index} href={item.href} className="lg:w-6/12 md:w-6/12 w-full block group">
                <GlareHover
                  className="w-full border-e border-border last:border-e-0 border-b md:border-b-0 lg:border-b-0 hover:bg-muted/60 dark:hover:bg-muted/40 transition-colors"
                  glareColor="#ffffff"
                  glareOpacity={0.75}
                  glareAngle={45}
                  glareSize={200}
                  transitionDuration={700}
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-2">
                        <h5 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h5>
                        <div className="p-2.5 rounded-full outline outline-border text-[#4274D9] dark:text-[#60A5FA] bg-muted/40 shrink-0 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:outline-primary transition-all">
                          <Icon icon={item.cardIcon} width={18} height={18} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <h5 className="text-xl sm:text-2xl font-bold text-foreground">{item.subtitle}</h5>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.subtext}</p>
                      </div>
                    </div>
                  </div>
                </GlareHover>
              </Link>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

export default QuickActionsSchedule
