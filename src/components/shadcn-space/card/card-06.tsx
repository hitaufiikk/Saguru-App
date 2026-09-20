"use client"

import { useState, useEffect } from "react"
import { Icon } from "@iconify/react"
import { Card, CardContent } from "@/components/ui/card"
import GlareHover from "@/components/glare-hover"
import { JADWAL_BU_DEVY, getEffectiveScheduleDay } from "@/lib/data-jadwal"
import { dashboardService } from "@/lib/services/dashboardService"

const StatisticsCard = () => {
  const [statsError, setStatsError] = useState(false)
  const [recorded, setRecorded] = useState(0)
  const [taskError, setTaskError] = useState(false)
  const [totalSiswa, setTotalSiswa] = useState(0)
  const [totalHadir, setTotalHadir] = useState(0)
  const [totalTugas, setTotalTugas] = useState(0)
  const [jadwalSummary, setJadwalSummary] = useState<{
    sessionsCount: number
    dayName: string
    ruangan: string
  }>({
    sessionsCount: 0,
    dayName: "Senin",
    ruangan: "Ruang 9A & 9B",
  })

  useEffect(() => {
    let isMounted = true
    let studentRequest = 0

    const updateStats = async () => {
      const request = ++studentRequest
      try {
        const stats = await dashboardService.attendance()
        if (!isMounted || request !== studentRequest) return
        setTotalSiswa(stats.total)
        setTotalHadir(stats.present)
        setRecorded(stats.recorded)
        setStatsError(false)
      } catch {
        if (isMounted && request === studentRequest) setStatsError(true)
      }
    }
    let taskRequest = 0
    const updateTaskCount = async () => {
      const request = ++taskRequest
      try {
        const count = await dashboardService.taskCount()
        if (!isMounted || request !== taskRequest) return
        setTotalTugas(count)
        setTaskError(false)
      } catch { if (isMounted && request === taskRequest) setTaskError(true) }
    }

    const updateJadwalInfo = () => {
      const info = getEffectiveScheduleDay()
      const activeSessions = JADWAL_BU_DEVY.filter(
        (item) => item.hari === info.dayName && !item.isBreak
      )
      const uniqueRuangan = Array.from(new Set(activeSessions.map((s) => s.ruangan).filter((r) => r && r !== "-")))

      setJadwalSummary({
        sessionsCount: activeSessions.length,
        dayName: info.dayName,
        ruangan: uniqueRuangan.length > 0 ? uniqueRuangan.join(" & ") : "Ruang 9A & 9B",
      })
    }

    updateStats()
    updateTaskCount()
    updateJadwalInfo()
    const timer = window.setInterval(updateStats, 60_000)

    window.addEventListener("saguru-data-updated", updateStats)
    window.addEventListener("saguru-tasks-updated", updateTaskCount)

    return () => {
      window.clearInterval(timer)
      isMounted = false
      studentRequest++
      window.removeEventListener("saguru-data-updated", updateStats)
      window.removeEventListener("saguru-tasks-updated", updateTaskCount)
    }
  }, [])

  const presensiPercentage = totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 0

  const TeacherActions = [
    {
      title: "Data Siswa",
      subtitle: statsError ? "—" : `${totalSiswa} Siswa`,
      subtext: statsError ? "Gagal memuat data" : totalSiswa > 0 ? "Terdaftar Aktif" : "Belum Ada Siswa",
      cardIcon: "solar:users-group-two-rounded-bold-duotone",
    },
    {
      title: "Presensi Hari Ini",
      subtitle: statsError ? "—" : `${presensiPercentage}%`,
      subtext: statsError ? "Gagal memuat presensi" : recorded > 0 ? `${totalHadir} Hadir • ${totalSiswa - recorded} Belum Dicatat` : "Belum Ada Presensi Tercatat",
      cardIcon: "solar:clipboard-check-bold-duotone",
    },
    {
      title: "Tagihan Tugas",
      subtitle: taskError ? "—" : `${totalTugas} Tugas`,
      subtext: taskError ? "Gagal memuat tugas" : totalTugas === 0 ? "Belum Ada Tugas" : `${totalSiswa} Siswa Terdaftar`,
      cardIcon: "solar:document-text-bold-duotone",
    },
    {
      title: "Jadwal Guru",
      subtitle: `${jadwalSummary.sessionsCount} Sesi`,
      subtext: `${jadwalSummary.ruangan} (${jadwalSummary.dayName})`,
      cardIcon: "solar:calendar-bold-duotone",
    },
  ]

  return (
    <div className="max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 w-full">
      <Card className="p-0 border border-border shadow-xs overflow-hidden bg-card text-card-foreground">
        <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0">
          {TeacherActions.map((item, index) => {
            return (
              <GlareHover
                className="lg:w-3/12 md:w-6/12 w-full border-e border-border last:border-e-0 border-b lg:border-b-0 hover:bg-muted/60 dark:hover:bg-muted/40 transition-colors"
                key={index}
                glareColor="#ffffff"
                glareOpacity={0.75}
                glareAngle={45}
                glareSize={200}
                transitionDuration={700}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <h5 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</h5>
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
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

export default StatisticsCard
