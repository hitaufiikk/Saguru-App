import { supabase } from "@/lib/supabase"
import { validateStudentsForSave, ParsedStudentRow } from "@/lib/import-utils"

export interface StudentRecord {
  id?: string
  noAbs?: number
  nisn: string
  nama: string
  gender: string
  kelas_code?: string
  wali_kelas?: string
  kontak_ortu?: string
  status?: string
  created_at?: string
}

export interface SaveMigratedResult {
  success: boolean
  count?: number
  error?: string
  conflicts?: Array<{ nisn: string; nama: string; existingKelas: string }>
}

function normalizeContact(value: string): string | null {
  const contact = value.trim()
  return contact && contact !== "-" ? contact : null
}

export const studentService = {
  // Fetch students for a specific class
  async getStudentsByClass(kelasCode: string, client = supabase): Promise<StudentRecord[]> {
    try {
      const { data, error } = await client
        .from("students")
        .select("*")
        .eq("kelas_code", kelasCode.toLowerCase())
        .order("nama", { ascending: true })

      if (error) {
        console.warn("Supabase fetch students warning:", error.message)
        throw new Error(error.message)
      }

      return (data || []).map((s, index) => ({
        id: s.id,
        noAbs: index + 1,
        nisn: s.nisn,
        nama: s.nama,
        gender: s.gender || "Laki-laki",
        kelas_code: s.kelas_code,
        wali_kelas: s.wali_kelas || "-",
        kontak_ortu: s.kontak_ortu || "",
        status: "HADIR",
      }))
    } catch (err) {
      console.error("Error in getStudentsByClass:", err)
      throw err
    }
  },

  // Fetch all students across all classes
  async getAllStudents(client = supabase): Promise<StudentRecord[]> {
    const { data, error } = await client
      .from("students")
      .select("*")
      .order("nama", { ascending: true })

    if (error) throw new Error(error.message)

    return (data || []).map((s, index) => ({
      id: s.id,
      noAbs: index + 1,
      nisn: s.nisn,
      nama: s.nama,
      gender: s.gender || "Laki-laki",
      kelas_code: s.kelas_code,
      wali_kelas: s.wali_kelas || "-",
      kontak_ortu: s.kontak_ortu || "",
      status: "HADIR",
    }))

  },

  // Batch insert/upsert migrated students from Excel/PDF
  async saveMigratedStudents(
    students: (StudentRecord | ParsedStudentRow)[],
    kelasCode: string,
    waliKelas: string,
    client: unknown = supabase
  ): Promise<SaveMigratedResult> {
    try {
      if (!client || typeof (client as { from?: unknown }).from !== "function") {
        return { success: false, error: "Koneksi database Supabase tidak tersedia." }
      }

      const activeClient = client as {
        from: (table: string) => {
          select: (cols: string) => {
            in: (col: string, values: string[]) => Promise<{
              data: Array<{ nisn: string; nama: string; kelas_code: string }> | null
              error: { message: string } | null
            }>
          }
          upsert: (
            payload: Array<{
              nisn: string
              nama: string
              gender: string
              kelas_code: string
              wali_kelas: string | null
            }>,
            options?: { onConflict: string }
          ) => Promise<{ error: { message: string } | null }>
        }
      }

      const targetKelas = (kelasCode || "").toLowerCase().trim()
      if (!targetKelas) {
        return { success: false, error: "Kode kelas target tidak valid." }
      }

      // 1. Validasi identitas sebelum data dikirim ke Supabase
      // Baris dengan identitas kosong, spasi, atau duplikat disaring
      const parsedRows: ParsedStudentRow[] = students.map((s, idx) => ({
        noAbs: s.noAbs || idx + 1,
        nisn: s.nisn,
        identityType: "identityType" in s && s.identityType ? s.identityType : "NISN",
        nama: s.nama,
        gender: s.gender,
        status: s.status || "HADIR",
      }))
      const validation = validateStudentsForSave(parsedRows)
      if (validation.validStudents.length === 0) {
        console.warn("saveMigratedStudents: Tidak ada siswa dengan identitas valid untuk disimpan.")
        return {
          success: false,
          error: "Tidak ada siswa dengan identitas valid untuk disimpan.",
        }
      }

      // 2. Format payload: HANYA kolom resmi tabel Supabase 'students'
      // id: uuid otomatis, nisn: text, nama: text, gender: text, kelas_code: text, wali_kelas: text nullable, created_at: timestamptz otomatis
      const formatted = validation.validStudents.map((s) => ({
        nisn: s.nisn,
        nama: s.nama,
        gender: s.gender,
        kelas_code: targetKelas,
        wali_kelas: waliKelas || null,
      }))

      // 3. Periksa identitas yang sudah ada di Supabase untuk mencegah konflik kelas
      const batchNisns = formatted.map((s) => s.nisn)
      const { data: existingStudents, error: checkError } = await activeClient
        .from("students")
        .select("nisn, nama, kelas_code")
        .in("nisn", batchNisns)

      if (checkError) {
        console.error("Supabase pre-check error:", checkError.message)
        return {
          success: false,
          error: `Gagal memverifikasi data siswa di server: ${checkError.message}`,
        }
      }

      if (existingStudents && existingStudents.length > 0) {
        const conflicts = existingStudents.filter(
          (es) => (es.kelas_code || "").toLowerCase().trim() !== targetKelas
        )

        if (conflicts.length > 0) {
          const conflictDetails = conflicts
            .map(
              (c) =>
                `• ${c.nama} (NISN/NIS: ${c.nisn}) sudah terdaftar di kelas ${String(c.kelas_code).toUpperCase()}`
            )
            .join("\n")

          return {
            success: false,
            error: `Konflik kelas terdeteksi pada ${conflicts.length} siswa. Seluruh batch dibatalkan untuk mencegah pemindahan siswa secara otomatis:\n${conflictDetails}`,
            conflicts: conflicts.map((c) => ({
              nisn: c.nisn,
              nama: c.nama,
              existingKelas: c.kelas_code,
            })),
          }
        }
      }

      // 4. Lakukan upsert berbasis 'nisn' HANYA jika tidak ada konflik kelas
      const { error: upsertError } = await activeClient
        .from("students")
        .upsert(formatted, { onConflict: "nisn" })

      if (upsertError) {
        console.error("Supabase batch upsert error:", upsertError.message)
        return {
          success: false,
          error: `Gagal menyimpan data ke database Supabase: ${upsertError.message}`,
        }
      }

      return {
        success: true,
        count: formatted.length,
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Terjadi kesalahan tidak terduga saat menyimpan data ke Supabase."
      console.error("Error in saveMigratedStudents:", err)
      return {
        success: false,
        error: errorMsg,
      }
    }
  },

  // Add single student
  async addStudent(student: StudentRecord, client = supabase): Promise<boolean> {
    try {
      const { error } = await client.from("students").insert([
        {
          nisn: student.nisn,
          nama: student.nama,
          gender: student.gender,
          kelas_code: (student.kelas_code || "9a").toLowerCase(),
          wali_kelas: student.wali_kelas || "-",
          ...(student.kontak_ortu !== undefined ? { kontak_ortu: normalizeContact(student.kontak_ortu) } : {}),
        },
      ])
      return !error
    } catch {
      return false
    }
  },

  // Update student details
  async updateStudent(nisn: string, updates: Partial<StudentRecord>, client = supabase): Promise<boolean> {
    const { data, error } = await client
      .from("students")
      .update({
        nama: updates.nama,
        gender: updates.gender,
        nisn: updates.nisn,
        ...(updates.kontak_ortu !== undefined ? { kontak_ortu: normalizeContact(updates.kontak_ortu) } : {}),
      })
      .eq("nisn", nisn)
      .select("nisn")

    if (error) {
      if (error.message.includes("kontak_ortu")) {
        throw new Error("Kolom kontak orang tua belum tersedia di database. Jalankan migrasi add_student_parent_contact terlebih dahulu.")
      }
      throw new Error(error.message)
    }
    if (data?.length !== 1) throw new Error("Perubahan belum tersimpan. Siswa mungkin sudah dihapus atau akses edit dibatasi.")
    return true
  },

  // Only the master student screen calls this operation. Returned rows verify
  // actual deletion (RLS can otherwise yield a successful zero-row response).
  async deleteStudents(nisns: string[], kelasCode: string, client = supabase) {
    const ids = [...new Set(nisns.filter((id) => id.trim()))]
    const kelas = kelasCode.trim().toLowerCase()
    if (!ids.length || !kelas) {
      return { deletedNisns: [] as string[], error: "Pilih siswa dan kelas yang valid." }
    }
    try {
      const { data, error } = await client.from("students").delete()
        .eq("kelas_code", kelas).in("nisn", ids).select("nisn")
      if (error) return { deletedNisns: [] as string[], error: error.message }
      const deletedNisns = (data || []).map((row) => String(row.nisn))
      return {
        deletedNisns,
        error: deletedNisns.length === ids.length ? null
          : `${deletedNisns.length} dari ${ids.length} siswa terhapus. Muat ulang daftar; sebagian data mungkin sudah berubah atau akses hapus dibatasi.`,
      }
    } catch (error) {
      return { deletedNisns: [] as string[], error: error instanceof Error ? error.message : "Gagal menghapus siswa." }
    }
  },
}
