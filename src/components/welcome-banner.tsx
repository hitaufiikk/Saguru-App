"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Minus, X, Calendar, ClipboardCheck } from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

import { getTodayScheduleSummary } from "@/lib/data-jadwal"

const defaultStudentData: any[] = []

function getPresensiStats() {
  let allStudents: any[] = []
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("saguru_migrated_students")
      const deletedPresensi = localStorage.getItem("saguru_presensi_deleted_nisns")
      const deletedMap = deletedPresensi ? JSON.parse(deletedPresensi) : {}

      if (stored) {
        const map = JSON.parse(stored)
        Object.keys(map).forEach((k) => {
          if (Array.isArray(map[k])) {
            const hiddenNisns: string[] = deletedMap[k] || []
            const classStudents = map[k].filter((s: any) => !hiddenNisns.includes(s.nisn))
            allStudents.push(...classStudents)
          }
        })
      }
    } catch (err) {}
  }

  const total = allStudents.length
  const hadir = allStudents.filter((s: { status?: string }) => {
    const isAbsence = s.status && ["DISPEN", "SAKIT", "ALPHA"].includes(s.status)
    return !isAbsence
  }).length
  const percentage = total > 0 ? Math.round((hadir / total) * 100) : 100

  return { total, hadir, percentage }
}

function getPendingTasksCount() {
  if (typeof window === "undefined") return { totalTasks: 0, pendingCount: 0 }

  try {
    const storedTasks = localStorage.getItem("saguru_tasks_list")
    const tasks = storedTasks ? JSON.parse(storedTasks) : []
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return { totalTasks: 0, pendingCount: 0 }
    }

    const storedGrades = localStorage.getItem("saguru_grades_matrix")
    const grades = storedGrades ? JSON.parse(storedGrades) : {}

    const stored = localStorage.getItem("saguru_migrated_students")
    const deletedTugas = localStorage.getItem("saguru_tugas_deleted_nisns")
    const deletedMap = deletedTugas ? JSON.parse(deletedTugas) : {}
    const map = stored ? JSON.parse(stored) : {}

    let totalPending = 0
    let totalAllTasks = tasks.length

    const activeClasses = Object.keys(map).filter((k) => Array.isArray(map[k]) && map[k].length > 0)

    if (activeClasses.length === 0) {
      return { totalTasks: totalAllTasks, pendingCount: totalAllTasks }
    }

    tasks.forEach((t: { id: number; mapel?: string }) => {
      const mapel = t.mapel || "Matematika"
      let isTaskPending = false

      for (const classCode of activeClasses) {
        const hiddenNisns: string[] = deletedMap[classCode] || []
        const classStudents = map[classCode].filter((s: any) => !hiddenNisns.includes(s.nisn))

        if (classStudents.length === 0) continue

        const hasPendingStudent = classStudents.some((s: { nisn: string }) => {
          const key = `${s.nisn}_${classCode}_${mapel}_${t.id}`
          const g = grades[key]
          return !g || g.status !== "DINILAI" || g.score === null
        })

        if (hasPendingStudent) {
          isTaskPending = true
          break
        }
      }

      if (isTaskPending) {
        totalPending++
      }
    })

    return { totalTasks: totalAllTasks, pendingCount: totalPending }
  } catch (err) {
    return { totalTasks: 0, pendingCount: 0 }
  }
}

export function WelcomeBanner() {
  const [isClosed, setIsClosed] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [timeStr, setTimeStr] = useState("")

  const [stats, setStats] = useState(() => ({
    presensi: getPresensiStats(),
    pendingTasks: getPendingTasksCount(),
    schedule: getTodayScheduleSummary(),
  }))

  const refreshStats = () => {
    setStats({
      presensi: getPresensiStats(),
      pendingTasks: getPendingTasksCount(),
      schedule: getTodayScheduleSummary(),
    })
  }

  useEffect(() => {
    refreshStats()
    window.addEventListener("saguru-data-updated", refreshStats)
    window.addEventListener("saguru-tasks-updated", refreshStats)
    window.addEventListener("saguru-jadwal-updated", refreshStats)
    window.addEventListener("storage", refreshStats)
    return () => {
      window.removeEventListener("saguru-data-updated", refreshStats)
      window.removeEventListener("saguru-tasks-updated", refreshStats)
      window.removeEventListener("saguru-jadwal-updated", refreshStats)
      window.removeEventListener("storage", refreshStats)
    }
  }, [])

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, "0")
      const minutes = String(now.getMinutes()).padStart(2, "0")
      const seconds = String(now.getSeconds()).padStart(2, "0")
      setTimeStr(`${hours}:${minutes}:${seconds}`)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
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
    <div className="w-full max-w-5xl lg:max-w-6xl mx-auto my-6 px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-md border border-border border-t-4 border-t-emerald-600 dark:border-t-emerald-500 bg-card text-card-foreground shadow-xs transition-all duration-200">
        
        {/* Header Bar dengan Judul Tengah & Tombol Aksi Kanan */}
        <div className="relative flex items-center justify-between px-4 py-3 sm:px-6 border-b border-border/40 bg-card z-20">
          {/* Judul Tepat Di Tengah */}
          <div className="flex-1 text-center font-semibold text-base sm:text-lg text-foreground/90">
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

        {/* Isi Konten Dalam Bentuk Carousel Landscape dengan Loop Tak Terbatas */}
        {!isMinimized && (
          <div className="relative px-8 py-5 sm:px-12 sm:py-6">
            <Carousel opts={{ loop: true }} className="w-full">
              <CarouselContent>
                {/* Slide 1: Informasi Periode Akademik & Tanggal Realtime */}
                <CarouselItem>
                  <div className="flex flex-col items-center justify-center text-center space-y-2 py-2 text-xs sm:text-sm font-medium">
                    <div className="text-foreground/90">
                      Saat ini Periode Semester <strong className="font-bold text-foreground">Genap</strong> Tahun Akademik <strong className="font-bold text-foreground">25/26</strong> 😊
                    </div>
                    <div className="text-foreground/80 flex flex-wrap items-center justify-center gap-1">
                      <span>
                        <strong className="text-foreground">Selasa</strong> <span className="text-blue-600 dark:text-blue-400 font-bold">Kliwon</span>,
                      </span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">11 Agustus 2026 Masehi</span>,
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">28 Safar 1448 Hijriah</span>
                      {timeStr && <span className="text-foreground/90 font-mono">Pukul: {timeStr} WIB</span>}
                    </div>
                  </div>
                </CarouselItem>

                {/* Slide 3: Ringkasan Presensi & Tugas */}
                <CarouselItem>
                  <div className="flex flex-col items-center justify-center text-center space-y-2 py-2 text-xs sm:text-sm font-medium">
                    <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <ClipboardCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>
                        Presensi Kelas 9A Hari Ini:{" "}
                        <strong className="font-bold text-foreground">
                          {stats.presensi.total === 0
                            ? "Belum Ada Data Siswa"
                            : `${stats.presensi.hadir} Siswa Hadir (${stats.presensi.percentage}% Lengkap)`}
                        </strong>
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Status Tugas:{" "}
                      <span className="font-semibold text-foreground">
                        {stats.pendingTasks.totalTasks === 0
                          ? "Belum Ada Tagihan Tugas"
                          : stats.pendingTasks.pendingCount > 0
                          ? `${stats.pendingTasks.pendingCount} Tugas Menunggu Penilaian Guru`
                          : "Semua Tugas Sudah Dinilai"}
                      </span>
                    </div>
                  </div>
                </CarouselItem>

                {/* Slide 4: Jadwal Mengajar Hari Ini / Mendatang */}
                <CarouselItem>
                  <div className="flex flex-col items-center justify-center text-center space-y-2 py-2 text-xs sm:text-sm font-medium">
                    <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300">
                      <Calendar className="h-4 w-4 text-[#4274D9] dark:text-[#60A5FA] shrink-0" />
                      <span>
                        {stats.schedule.isUpcoming
                          ? `Jadwal Mengajar Mendatang (${stats.schedule.dayName}): `
                          : `Jadwal Mengajar Hari Ini (${stats.schedule.dayName}): `}
                        <strong className="font-bold text-foreground">{stats.schedule.firstSessionText}</strong>
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Ruang Kelas: <span className="font-semibold text-foreground">{stats.schedule.firstSessionRoom}</span>
                    </div>
                  </div>
                </CarouselItem>
              </CarouselContent>

              {/* Tombol Navigasi Carousel Previous & Next */}
              <CarouselPrevious className="-left-6 sm:-left-8 h-8 w-8" />
              <CarouselNext className="-right-6 sm:-right-8 h-8 w-8" />
            </Carousel>
          </div>
        )}
      </div>
    </div>
  )
}
