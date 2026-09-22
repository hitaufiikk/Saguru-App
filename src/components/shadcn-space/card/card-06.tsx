"use client"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUsers, faClipboardCheck, faListCheck } from "@fortawesome/free-solid-svg-icons"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import GlareHover from "@/components/glare-hover"
import { dashboardService } from "@/lib/services/dashboardService"

const StatisticsCard = () => {
  const [statsError, setStatsError] = useState(false)
  const [recorded, setRecorded] = useState(0)
  const [taskError, setTaskError] = useState(false)
  const [totalSiswa, setTotalSiswa] = useState(0)
  const [totalHadir, setTotalHadir] = useState(0)
  const [totalTugas, setTotalTugas] = useState(0)


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

    updateStats()
    updateTaskCount()

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
      title: "Data Seluruh Siswa",
      subtitle: statsError ? "—" : `${totalSiswa} Siswa`,
      subtext: statsError
        ? "Gagal memuat data"
        : totalSiswa > 0
          ? "Terdaftar Aktif"
          : "Belum Ada Siswa",
      cardIcon: faUsers
    },
    {
      title: "Presensi Hari Ini",
      subtitle: statsError ? "—" : `${presensiPercentage}%`,
      subtext: statsError ? "Gagal memuat presensi" : recorded > 0 ? `${totalHadir} Hadir • ${totalSiswa - recorded} Belum Dicatat` : "Belum Ada Presensi Tercatat",
      cardIcon: faClipboardCheck,
    },
    {
      title: "Tagihan Tugas",
      subtitle: taskError ? "—" : `${totalTugas} Tugas`,
      subtext: taskError ? "Gagal memuat tugas" : totalTugas === 0 ? "Belum Ada Tugas" : `${totalSiswa} Siswa Terdaftar`,
      cardIcon: faListCheck,
    }
  ]

  return (
    <div className="max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 w-full">
      <Card className="p-0 border border-border shadow-xs overflow-hidden bg-card text-card-foreground">
        <CardContent className="grid w-full grid-cols-1 md:grid-cols-3 px-0">
          {TeacherActions.map((item, index) => {
            return (
              <GlareHover
                className="min-w-0 w-full border-border border-b last:border-b-0 md:border-b-0 md:border-e md:last:border-e-0 hover:bg-muted/60 dark:hover:bg-muted/40 transition-colors"
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
                      <div className="p-2.5 shrink-0 transition-transform duration-200 hover:scale-110">
                        <FontAwesomeIcon
                          icon={item.cardIcon}
                          aria-hidden="true"
                          style={{ color: "rgb(116, 192, 252)", width: 26, height: 26 }}
                        />
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
