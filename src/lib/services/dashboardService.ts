import { supabase } from "@/lib/supabase"
import { schoolDate } from "@/lib/school-date"

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
}
