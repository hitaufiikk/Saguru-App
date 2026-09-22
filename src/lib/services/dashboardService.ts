import { supabase } from "@/lib/supabase"
import { schoolDate } from "@/lib/school-date"
import { parseTaskTitle } from "@/lib/services/tugasService"

export interface ClassAttendanceSummary {
  kelasCode: string
  kelasDisplayName: string
  isWaliKelas?: boolean
  totalStudents: number
  recordedCount: number
  unrecordedCount: number
  hadirCount: number
  status: "NO_STUDENTS" | "NOT_RECORDED" | "RECORDED"
  isComplete: boolean
}

export interface TaskSummaryItem {
  id: number
  title: string
  label?: string
  topic?: string
  mapel: string
  kelasCode: string
  deadline: string
  isOverdue: boolean
  isUpcoming: boolean
  hasDeadline: boolean
  formattedDeadline: string
  unsubmittedCount: number
  totalStudents: number
}

export interface PendingTasksSummary {
  totalTasks: number
  tasksWithPendingCount: number
  pendingTasks: TaskSummaryItem[]
  status: "NO_TASKS" | "ALL_SUBMITTED" | "HAS_PENDING"
}

export function parseDeadlineInfo(deadlineRaw?: string, todayStr = schoolDate()): {
  isOverdue: boolean
  isUpcoming: boolean
  hasDeadline: boolean
  formattedDeadline: string
  sortKey: number
} {
  const d = (deadlineRaw || "").trim()
  if (!d) {
    return {
      isOverdue: false,
      isUpcoming: false,
      hasDeadline: false,
      formattedDeadline: "Tanpa tenggat",
      sortKey: Infinity,
    }
  }

  const isoMatch = d.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    const [, y, m, day] = isoMatch
    const dStr = `${y}-${m}-${day}`
    const isOverdue = dStr < todayStr
    const isUpcoming = dStr >= todayStr

    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    const mIdx = parseInt(m, 10) - 1
    const formatted = `${parseInt(day, 10)} ${months[mIdx] || m} ${y}`
    const timeVal = new Date(`${dStr}T00:00:00+07:00`).getTime()

    return {
      isOverdue,
      isUpcoming,
      hasDeadline: true,
      formattedDeadline: formatted,
      sortKey: timeVal,
    }
  }

  const parsed = Date.parse(d)
  if (!isNaN(parsed)) {
    const dateObj = new Date(parsed)
    const dateJakartaStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dateObj)

    const isOverdue = dateJakartaStr < todayStr
    const isUpcoming = dateJakartaStr >= todayStr

    const dateFormatter = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      year: "numeric",
    })

    return {
      isOverdue,
      isUpcoming,
      hasDeadline: true,
      formattedDeadline: dateFormatter.format(dateObj),
      sortKey: parsed,
    }
  }

  return {
    isOverdue: false,
    isUpcoming: true,
    hasDeadline: true,
    formattedDeadline: d,
    sortKey: Infinity - 100,
  }
}

export const dashboardService = {
  async attendance(client = supabase, date = schoolDate()) {
    const [students, attendance] = await Promise.all([
      client.from("students").select("nisn, kelas_code"),
      client.from("presensi").select("nisn, kelas_code, status").eq("tanggal_presensi", date),
    ])
    if (students.error) throw students.error
    if (attendance.error) throw attendance.error
    const enrolled = new Set((students.data || []).map(s => `${s.kelas_code}:${s.nisn}`))
    const recorded = new Map((attendance.data || []).filter(a => enrolled.has(`${a.kelas_code}:${a.nisn}`))
      .map(a => [`${a.kelas_code}:${a.nisn}`, a.status]))
    return { total: enrolled.size, recorded: recorded.size,
      present: [...recorded.values()].filter(status => status === "HADIR").length }
  },

  async taskCount(client = supabase) {
    const { count, error } = await client.from("tasks").select("id", { count: "exact", head: true })
    if (error) throw error
    return count || 0
  },

  /**
   * Mengambil ringkasan presensi per kelas untuk tanggal tertentu (Asia/Jakarta).
   * Membedakan kelengkapan pencatatan dengan tingkat kehadiran.
   * Siswa sakit/izin/dispen/alpa dihitung dicatat, tapi bukan hadir.
   */
  async getClassesAttendanceSummary(
    classes: string[] = ["8i", "8h", "9a", "9b"],
    date: string = schoolDate(),
    client = supabase
  ): Promise<ClassAttendanceSummary[]> {
    const cleanClasses = classes.map((c) => c.toLowerCase())

    const [studentsRes, attendanceRes] = await Promise.all([
      client
        .from("students")
        .select("nisn, nama, kelas_code")
        .in("kelas_code", cleanClasses),
      client
        .from("presensi")
        .select("nisn, kelas_code, status")
        .eq("tanggal_presensi", date)
        .in("kelas_code", cleanClasses),
    ])

    if (studentsRes.error) throw studentsRes.error
    if (attendanceRes.error) throw attendanceRes.error

    const allStudents = studentsRes.data || []
    const allAttendance = attendanceRes.data || []

    const validStatuses = new Set(["HADIR", "DISPEN", "SAKIT", "ALPHA", "IZIN"])

    return cleanClasses.map((cls) => {
      const classStudents = allStudents.filter(
        (s) => (s.kelas_code || "").toLowerCase() === cls
      )
      const totalStudents = classStudents.length

      if (totalStudents === 0) {
        return {
          kelasCode: cls,
          kelasDisplayName: cls.toUpperCase(),
          isWaliKelas: cls === "9a",
          totalStudents: 0,
          recordedCount: 0,
          unrecordedCount: 0,
          hadirCount: 0,
          status: "NO_STUDENTS",
          isComplete: false,
        }
      }

      const classAttendance = allAttendance.filter(
        (a) => (a.kelas_code || "").toLowerCase() === cls
      )
      const attMap = new Map(classAttendance.map((a) => [a.nisn, a.status]))

      const recordedCount = classStudents.filter((s) => {
        const st = attMap.get(s.nisn)
        return st && validStatuses.has(st)
      }).length

      const unrecordedCount = Math.max(0, totalStudents - recordedCount)
      const hadirCount = classStudents.filter((s) => attMap.get(s.nisn) === "HADIR").length

      const status: "NOT_RECORDED" | "RECORDED" = recordedCount === 0 ? "NOT_RECORDED" : "RECORDED"

      return {
        kelasCode: cls,
        kelasDisplayName: cls.toUpperCase(),
        isWaliKelas: cls === "9a",
        totalStudents,
        recordedCount,
        unrecordedCount,
        hadirCount,
        status,
        isComplete: recordedCount === totalStudents,
      }
    })
  },

  /**
   * Mengambil ringkasan tugas aktif untuk kelas target.
   * Mendahulukan tugas lewat tenggat, lalu tugas dengan tenggat terdekat (maks 3 tugas).
   * Nilai 0 atau status DINILAI/KUMPUL/TERLAMBAT dihitung sudah mengumpulkan.
   */
  async getPendingTasksSummary(
    classes: string[] = ["8i", "8h", "9a", "9b"],
    todayDate: string = schoolDate(),
    client = supabase
  ): Promise<PendingTasksSummary> {
    const cleanClasses = classes.map((c) => c.toLowerCase())

    const [studentsRes, tasksRes, gradesRes] = await Promise.all([
      client
        .from("students")
        .select("nisn, kelas_code")
        .in("kelas_code", cleanClasses),
      client
        .from("tasks")
        .select("id, title, mapel, kelas_code, deadline, created_at")
        .in("kelas_code", cleanClasses),
      client
        .from("grades")
        .select("task_id, nisn, kelas_code, score, status")
        .in("kelas_code", cleanClasses),
    ])

    if (studentsRes.error) throw studentsRes.error
    if (tasksRes.error) throw tasksRes.error
    if (gradesRes.error) throw gradesRes.error

    const allStudents = studentsRes.data || []
    const allTasks = tasksRes.data || []
    const allGrades = gradesRes.data || []

    const totalTasks = allTasks.length
    if (totalTasks === 0) {
      return {
        totalTasks: 0,
        tasksWithPendingCount: 0,
        pendingTasks: [],
        status: "NO_TASKS",
      }
    }

    // Kelompokkan siswa berdasarkan kelas
    const studentsByClass = new Map<string, string[]>()
    for (const s of allStudents) {
      const k = (s.kelas_code || "").toLowerCase()
      if (!studentsByClass.has(k)) studentsByClass.set(k, [])
      studentsByClass.get(k)!.push(s.nisn)
    }

    // Kelompokkan grades berdasarkan task_id
    const gradesByTask = new Map<number, Map<string, { score: number | null; status: string }>>()
    for (const g of allGrades) {
      if (!gradesByTask.has(g.task_id)) gradesByTask.set(g.task_id, new Map())
      gradesByTask.get(g.task_id)!.set(g.nisn, {
        score: g.score !== null && g.score !== undefined ? Number(g.score) : null,
        status: g.status || "BELUM",
      })
    }

    const tasksWithUnsubmitted: TaskSummaryItem[] = []

    for (const task of allTasks) {
      const taskClass = (task.kelas_code || "").toLowerCase()
      const classStudentNisns = studentsByClass.get(taskClass) || []
      const taskGrades = gradesByTask.get(task.id) || new Map()

      // Hitung siswa yang belum mengumpulkan
      let unsubmittedCount = 0
      for (const nisn of classStudentNisns) {
        const g = taskGrades.get(nisn)
        const isSubmitted = Boolean(
          g &&
          (
            (g.status === "DINILAI" && g.score !== null) ||
            g.status === "KUMPUL" ||
            g.status === "TERLAMBAT"
          )
        )
        if (!isSubmitted) {
          unsubmittedCount++
        }
      }

      if (unsubmittedCount > 0) {
        const parsed = parseTaskTitle(task.title)
        const deadlineInfo = parseDeadlineInfo(task.deadline, todayDate)

        tasksWithUnsubmitted.push({
          id: task.id,
          title: task.title,
          label: parsed.label,
          topic: parsed.topic,
          mapel: task.mapel || "Matematika",
          kelasCode: task.kelas_code,
          deadline: task.deadline || "",
          isOverdue: deadlineInfo.isOverdue,
          isUpcoming: deadlineInfo.isUpcoming,
          hasDeadline: deadlineInfo.hasDeadline,
          formattedDeadline: deadlineInfo.formattedDeadline,
          unsubmittedCount,
          totalStudents: classStudentNisns.length,
        })
      }
    }

    if (tasksWithUnsubmitted.length === 0) {
      return {
        totalTasks,
        tasksWithPendingCount: 0,
        pendingTasks: [],
        status: "ALL_SUBMITTED",
      }
    }

    // Urutkan: Dahulukan tugas lewat tenggat, lalu tugas dengan tenggat terdekat
    tasksWithUnsubmitted.sort((a, b) => {
      const dA = parseDeadlineInfo(a.deadline, todayDate)
      const dB = parseDeadlineInfo(b.deadline, todayDate)

      // 1. Lewat tenggat vs tidak lewat tenggat
      if (dA.isOverdue && !dB.isOverdue) return -1
      if (!dA.isOverdue && dB.isOverdue) return 1

      // 2. Jika sama-sama lewat tenggat: yang lebih lama lewat tenggat lebih dulu
      if (dA.isOverdue && dB.isOverdue) {
        return dA.sortKey - dB.sortKey
      }

      // 3. Jika sama-sama belum lewat tenggat:
      if (dA.hasDeadline && !dB.hasDeadline) return -1
      if (!dA.hasDeadline && dB.hasDeadline) return 1

      if (dA.hasDeadline && dB.hasDeadline) {
        // Tenggat terdekat lebih dulu
        return dA.sortKey - dB.sortKey
      }

      // 4. Tanpa tenggat: id tugas lebih baru didahulukan
      return b.id - a.id
    })

    return {
      totalTasks,
      tasksWithPendingCount: tasksWithUnsubmitted.length,
      pendingTasks: tasksWithUnsubmitted.slice(0, 3),
      status: "HAS_PENDING",
    }
  },
}
