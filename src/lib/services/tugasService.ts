import { supabase } from "@/lib/supabase"

export interface TaskRecord {
  id: number
  title: string
  label?: string
  topic?: string
  mapel: string
  kelas_code: string
  deadline?: string
  created_at?: string
}

export interface GradeRecord {
  id?: string
  task_id: number
  nisn: string
  kelas_code: string
  score: number | null
  status: string
  catatan?: string
}

export function parseTaskTitle(rawTitle: string, fallbackIndex = 1): { label: string; topic: string } {
  const trimmed = (rawTitle || "").trim()
  if (!trimmed) {
    return { label: `Tugas ${fallbackIndex}`, topic: `Tugas ${fallbackIndex}` }
  }

  // Format standar: [Label] Topik/Deskripsi
  const bracketMatch = trimmed.match(/^\[(.*?)\]\s*(.*)$/)
  if (bracketMatch) {
    const label = bracketMatch[1].trim() || `Tugas ${fallbackIndex}`
    const topic = bracketMatch[2].trim() || label
    return { label, topic }
  }

  // Format umum: "Tugas 1: Topik", "UH 1 - Topik", "PR 2 : Topik"
  const prefixMatch = trimmed.match(/^((?:Tugas|UH|PR|PTS|PAS|Proyek|Remedial)\s*[\w.-]*)\s*[:\-–]\s*(.*)$/i)
  if (prefixMatch) {
    const label = prefixMatch[1].trim()
    const topic = prefixMatch[2].trim() || label
    return { label, topic }
  }

  // Jika input hanya berupa nomor/kode saja seperti "Tugas 1", "UH 2", "PR 1"
  if (/^(?:Tugas|UH|PR|PTS|PAS|Proyek|Remedial)\s*[\w.-]*$/i.test(trimmed)) {
    return { label: trimmed, topic: trimmed }
  }

  // Fallback data legacy
  return { label: `Tugas ${fallbackIndex}`, topic: trimmed }
}

export function formatTaskTitle(label: string, topic: string): string {
  const cleanLabel = (label || "").trim()
  const cleanTopic = (topic || "").trim()
  if (!cleanTopic || cleanTopic.toLowerCase() === cleanLabel.toLowerCase()) {
    return cleanLabel ? `[${cleanLabel}]` : "[Tugas 1]"
  }
  return `[${cleanLabel}] ${cleanTopic}`
}

export const tugasService = {
  // Fetch task catalog for a class
  async getTasksByClass(kelasCode: string, client = supabase): Promise<TaskRecord[]> {
    try {
      const { data, error } = await client
        .from("tasks")
        .select("*")
        .eq("kelas_code", kelasCode.toLowerCase())
        .order("created_at", { ascending: true })

      if (error) throw error

      return (data || []).map((t, idx) => {
        const parsed = parseTaskTitle(t.title, idx + 1)
        return {
          id: t.id,
          title: t.title,
          label: parsed.label,
          topic: parsed.topic,
          mapel: t.mapel || "Matematika",
          kelas_code: t.kelas_code,
          deadline: t.deadline || "",
        }
      })
    } catch (err) {
      throw err
    }
  },

  // Add new task
  async addTask(title: string, mapel: string, kelasCode: string, deadline = "", client = supabase): Promise<TaskRecord | null> {
    try {
      const { data, error } = await client
        .from("tasks")
        .insert([
          {
            title: title.trim(),
            deadline: deadline.trim(),
            mapel: mapel.trim(),
            kelas_code: kelasCode.toLowerCase(),
          },
        ])
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error("Server tidak mengembalikan tugas.")
      const parsed = parseTaskTitle(data.title, 1)
      return {
        id: data.id,
        title: data.title,
        label: parsed.label,
        topic: parsed.topic,
        mapel: data.mapel,
        kelas_code: data.kelas_code,
        deadline: data.deadline || "",
      }
    } catch (err) {
      throw err
    }
  },

  // Update existing task (title, deadline, mapel)
  async updateTask(
    taskId: number,
    kelasCode: string,
    updates: { title?: string; deadline?: string; mapel?: string },
    client = supabase
  ): Promise<boolean> {
    try {
      const payload: Record<string, string> = {}
      if (updates.title !== undefined) payload.title = updates.title.trim()
      if (updates.deadline !== undefined) payload.deadline = updates.deadline.trim()
      if (updates.mapel !== undefined) payload.mapel = updates.mapel.trim()

      const { error } = await client
        .from("tasks")
        .update(payload)
        .eq("id", taskId)
        .eq("kelas_code", kelasCode.toLowerCase())

      return !error
    } catch {
      return false
    }
  },

  // Delete task and its associated grades from Supabase
  async deleteTask(taskId: number, kelasCode: string, client = supabase): Promise<boolean> {
    try {
      await client
        .from("grades")
        .delete()
        .eq("task_id", taskId)
        .eq("kelas_code", kelasCode.toLowerCase())

      const { error } = await client
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
  async getGradesByClass(kelasCode: string, client = supabase): Promise<Record<string, { score: number | null; status: string; catatan: string }>> {
    try {
      const { data, error } = await client
        .from("grades")
        .select("task_id, nisn, score, status, mapel, catatan")
        .eq("kelas_code", kelasCode.toLowerCase())

      if (error) throw error

      const gradeMap: Record<string, { score: number | null; status: string; catatan: string }> = {}
      ;(data || []).forEach((row) => {
        const subject = row.mapel || "Matematika"
        const key = `${row.nisn}_${kelasCode.toLowerCase()}_${subject}_${row.task_id}`
        gradeMap[key] = {
          catatan: row.catatan || "",
          score: row.score !== null ? Number(row.score) : null,
          status: row.status || "BELUM",
        }
      })

      return gradeMap
    } catch (err) {
      throw err
    }
  },

  // One atomic upsert: a failed write never deletes the previous grade.
  async saveGrade(taskId: number, nisn: string, kelasCode: string,
    score: number | null, status: string, mapel = "Matematika", catatan = "", client = supabase): Promise<boolean> {
    if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) {
      throw new Error("Nilai harus antara 0 dan 100.")
    }
    const { data, error } = await client.from("grades").upsert({
      task_id: taskId, nisn, kelas_code: kelasCode.toLowerCase(), mapel,
      score, status, catatan: catatan.trim(), updated_at: new Date().toISOString(),
    }, { onConflict: "task_id,nisn" }).select("id").single()
    if (error) throw error
    if (!data) throw new Error("Nilai tidak tersimpan.")
    return true
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

  // Fetch freeform notes for binaan classes (9B, 8H, 8I)
  async getBinaanNotes(kelasCode: string): Promise<Record<string, string>> {
    try {
      const targetKelas = kelasCode.toLowerCase()
      // Try fetching from binaan_notes table first
      const { data, error } = await supabase
        .from("binaan_notes")
        .select("nisn, catatan")
        .eq("kelas_code", targetKelas)

      if (!error && data) {
        const noteMap: Record<string, string> = {}
        data.forEach((row) => {
          if (row.nisn) {
            noteMap[row.nisn] = row.catatan || ""
          }
        })
        return noteMap
      }

      // Fallback: Check grades table
      const { data: gradesData, error: gradesError } = await supabase
        .from("grades")
        .select("nisn, status")
        .eq("kelas_code", targetKelas)
        .eq("task_id", 0)
        .eq("mapel", "CatatanBinaan")

      if (gradesError || !gradesData) return {}

      const fallbackMap: Record<string, string> = {}
      gradesData.forEach((row) => {
        if (row.nisn) {
          fallbackMap[row.nisn] = row.status || ""
        }
      })
      return fallbackMap
    } catch {
      return {}
    }
  },

  // Save freeform note for a student in binaan class (multi-device sync)
  async saveBinaanNote(
    nisn: string,
    kelasCode: string,
    note: string
  ): Promise<boolean> {
    try {
      const targetKelas = kelasCode.toLowerCase()

      // 1. Primary: Upsert into dedicated binaan_notes table
      const { error: binaanError } = await supabase
        .from("binaan_notes")
        .upsert(
          [
            {
              nisn,
              kelas_code: targetKelas,
              catatan: note,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "nisn,kelas_code" }
        )

      if (!binaanError) {
        return true
      }

      // 2. Fallback if binaan_notes table is pending schema creation
      await supabase
        .from("grades")
        .delete()
        .eq("task_id", 0)
        .eq("nisn", nisn)
        .eq("kelas_code", targetKelas)
        .eq("mapel", "CatatanBinaan")

      const { error: gradeErr } = await supabase.from("grades").insert([
        {
          task_id: 0,
          nisn,
          kelas_code: targetKelas,
          mapel: "CatatanBinaan",
          score: null,
          status: note,
          updated_at: new Date().toISOString(),
        },
      ])

      return !gradeErr
    } catch {
      return false
    }
  },
}
