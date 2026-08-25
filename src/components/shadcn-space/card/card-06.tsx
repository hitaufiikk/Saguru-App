"use client"

import { useState, useEffect } from "react"
import { Icon } from "@iconify/react"
import { Card, CardContent } from "@/components/ui/card"
import GlareHover from "@/components/glare-hover"
import { JADWAL_BU_DEVY, getEffectiveScheduleDay } from "@/lib/data-jadwal"
import { studentService } from "@/lib/services/studentService"
import { tugasService } from "@/lib/services/tugasService"

const StatisticsCard = () => {
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

    const updateStats = async () => {
      // 1. Try Supabase first
      try {
        const allStudents = await studentService.getAllStudents()
        if (isMounted && allStudents && allStudents.length > 0) {
          const deletedPresensi = localStorage.getItem("saguru_presensi_deleted_nisns")
          const deletedMap = deletedPresensi ? JSON.parse(deletedPresensi) : {}

          // Map students by class to sync localStorage
          const classMap: Record<string, any[]> = {}
          allStudents.forEach((s) => {
            const cCode = (s.kelas_code || "9a").toLowerCase()
            if (!classMap[cCode]) classMap[cCode] = []
            classMap[cCode].push({
              noAbs: s.noAbs,
              nisn: s.nisn,
              nama: s.nama,
              gender: s.gender,
              status: s.status || "HADIR",
              kontakOrtu: s.kontak_ortu || "-",
            })
          })

          try {
            localStorage.setItem("saguru_migrated_students", JSON.stringify(classMap))
          } catch (e) {}

          let count = 0
          let hadir = 0
          Object.keys(classMap).forEach((k) => {
            const hiddenNisns: string[] = deletedMap[k] || []
            const active = classMap[k].filter((s) => !hiddenNisns.includes(s.nisn))
            count += active.length
            hadir += active.filter((s) => !["DISPEN", "SAKIT", "ALPHA"].includes(s.status)).length
          })

          setTotalSiswa(count)
          setTotalHadir(hadir)
          return
        }
      } catch (err) {
        console.warn("Supabase stats fetch fallback:", err)
      }

      // Fallback to local storage
      try {
        const stored = localStorage.getItem("saguru_migrated_students")
        const deletedPresensi = localStorage.getItem("saguru_presensi_deleted_nisns")
        const deletedMap = deletedPresensi ? JSON.parse(deletedPresensi) : {}

        if (stored) {
          const map = JSON.parse(stored)
          let count = 0
          let hadir = 0
          Object.keys(map).forEach((k) => {
            if (Array.isArray(map[k])) {
              const hiddenNisns: string[] = deletedMap[k] || []
              const active = map[k].filter((s: { nisn: string }) => !hiddenNisns.includes(s.nisn))
              count += active.length
              hadir += active.filter((s: { status?: string }) => {
                const isAbsence = s.status && ["DISPEN", "SAKIT", "ALPHA"].includes(s.status)
                return !isAbsence
              }).length
            }
          })
          if (isMounted) {
            setTotalSiswa(count)
            setTotalHadir(hadir)
          }
          return
        }
      } catch (err) {}

      if (isMounted) {
        setTotalSiswa(0)
        setTotalHadir(0)
      }
    }

    const updateTaskCount = async () => {
      try {
        const tasks = await tugasService.getTasksByClass("9a")
        if (isMounted && tasks && tasks.length > 0) {
          setTotalTugas(tasks.length)
          return
        }
      } catch (err) {}

      try {
        const stored = localStorage.getItem("saguru_tasks_list")
        if (stored) {
          const list = JSON.parse(stored)
          if (Array.isArray(list)) {
            if (isMounted) setTotalTugas(list.length)
            return
          }
        }
      } catch (err) {}
      if (isMounted) setTotalTugas(0)
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

    window.addEventListener("saguru-data-updated", updateStats)
    window.addEventListener("saguru-tasks-updated", updateTaskCount)

    return () => {
      window.removeEventListener("saguru-data-updated", updateStats)
      window.removeEventListener("saguru-tasks-updated", updateTaskCount)
    }
  }, [])

  const presensiPercentage = totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 0

  const TeacherActions = [
    {
      title: "Data Siswa",
      subtitle: `${totalSiswa} Siswa`,
      subtext: totalSiswa > 0 ? "Terdaftar Aktif" : "Belum Ada Siswa",
      cardIcon: "solar:users-group-two-rounded-bold-duotone",
    },
    {
      title: "Presensi Hari Ini",
      subtitle: totalSiswa > 0 ? `${presensiPercentage}%` : "0%",
      subtext: totalSiswa > 0 ? `${totalHadir} Siswa Hadir` : "Belum Ada Data",
      cardIcon: "solar:clipboard-check-bold-duotone",
    },
    {
      title: "Tagihan Tugas",
      subtitle: `${totalTugas} Tugas`,
      subtext: totalTugas === 0 ? "Belum Ada Tugas" : `${totalSiswa} Siswa Terdaftar`,
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
