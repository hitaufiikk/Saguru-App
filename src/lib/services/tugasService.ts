import { supabase } from "@/lib/supabase"

export interface TaskRecord {
  id: number
  title: string
  mapel: string
  kelas_code: string
  created_at?: string
}

export interface GradeRecord {
  id?: string
  task_id: number
  nisn: string
  kelas_code: string
  score: number | null
  status: string
}

export const tugasService = {
  // Fetch task catalog for a class
  async getTasksByClass(kelasCode: string): Promise<TaskRecord[]> {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("kelas_code", kelasCode.toLowerCase())
        .order("created_at", { ascending: true })

      if (error) return []

      return (data || []).map((t) => ({
        id: t.id,
        title: t.title,
        mapel: t.mapel || "Matematika",
        kelas_code: t.kelas_code,
      }))
    } catch (err) {
      return []
    }
  },

  // Add new task
  async addTask(title: string, mapel: string, kelasCode: string): Promise<TaskRecord | null> {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert([
          {
            title: title.trim(),
            mapel: mapel.trim(),
            kelas_code: kelasCode.toLowerCase(),
          },
        ])
        .select()
        .single()

      if (error || !data) return null
      return {
        id: data.id,
        title: data.title,
        mapel: data.mapel,
        kelas_code: data.kelas_code,
      }
    } catch (err) {
      return null
    }
  },

  // Delete task and its associated grades from Supabase
  async deleteTask(taskId: number, kelasCode: string): Promise<boolean> {
    try {
      await supabase
        .from("grades")
        .delete()
        .eq("task_id", taskId)
        .eq("kelas_code", kelasCode.toLowerCase())

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId)
        .eq("kelas_code", kelasCode.toLowerCase())

      return !error
    } catch (err) {
      return false
    }
  },

  // Fetch grades matrix for a class
  async getGradesByClass(kelasCode: string): Promise<Record<string, { score: number | null; status: string }>> {
    try {
      const { data, error } = await supabase
        .from("grades")
        .select("task_id, nisn, score, status, mapel")
        .eq("kelas_code", kelasCode.toLowerCase())

      if (error) return {}

      const gradeMap: Record<string, { score: number | null; status: string }> = {}
      ;(data || []).forEach((row) => {
        const subject = row.mapel || "Matematika"
        const key = `${row.nisn}_${kelasCode.toLowerCase()}_${subject}_${row.task_id}`
        gradeMap[key] = {
          score: row.score !== null ? Number(row.score) : null,
          status: row.status || "BELUM",
        }
      })

      return gradeMap
    } catch (err) {
      return {}
    }
  },

  // Save/Update student grade
  async saveGrade(
    taskId: number,
    nisn: string,
    kelasCode: string,
    score: number | null,
    status: string,
    mapel: string = "Matematika"
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from("grades").upsert(
        [
          {
            task_id: taskId,
            nisn,
            kelas_code: kelasCode.toLowerCase(),
            mapel: mapel || "Matematika",
            score,
            status,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "task_id,nisn" }
      )

      return !error
    } catch (err) {
      return false
    }
  },

  // Exclude / Hide NISN in Tagihan Tugas (Tugas Soft Delete)
  async addTugasExclusion(nisn: string, kelasCode: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("exclusions").upsert(
        [
          {
            nisn,
            kelas_code: kelasCode.toLowerCase(),
            menu_type: "tugas",
          },
        ],
        { onConflict: "nisn,kelas_code,menu_type" }
      )
      return !error
    } catch (err) {
      return false
    }
  },

  // Fetch excluded NISNs in Tagihan Tugas
  async getTugasExclusions(kelasCode: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from("exclusions")
        .select("nisn")
        .eq("kelas_code", kelasCode.toLowerCase())
        .eq("menu_type", "tugas")

      if (error) return []
      return (data || []).map((row) => row.nisn)
    } catch (err) {
      return []
    }
  },
}
