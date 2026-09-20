// -------------------------------------------------------------
// PENGUJIAN JALUR PENYIMPANAN SAGURU-APP (TEST STORAGE PATH)
// -------------------------------------------------------------
// Variabel lingkungan mock diinisialisasi HANYA pada runner pengujian
// sebelum modul Supabase dimuat melalui dynamic import,
// tanpa memodifikasi berkas konfigurasi produksi src/lib/supabase.ts.

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock-test.supabase.co"
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key"
}

interface UpsertRecord {
  nisn: string
  nama: string
  gender: string
  kelas_code: string
  wali_kelas: string | null
}

async function runStoragePathTests(): Promise<void> {
  console.log("=======================================================")
  console.log("🧪 PENGUJIAN JALUR PENYIMPANAN: SUPABASE & CACHE LOKAL")
  console.log("=======================================================\n")

  // Dynamic import agar process.env terpasang sebelum supabase diinisialisasi
  const { validateStudentsForSave, mergeStudentsCache } = await import("../src/lib/import-utils")
  type ParsedStudentRow = import("../src/lib/import-utils").ParsedStudentRow
  type CachedStudentItem = import("../src/lib/import-utils").CachedStudentItem
  const { studentService } = await import("../src/lib/services/studentService")
  const { supabase } = await import("../src/lib/supabase")

  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string, detail?: unknown): void {
    if (condition) {
      console.log(`✅ ${testName}`)
      if (detail) console.log(`   `, detail)
      passed++
    } else {
      console.error(`❌ GAGAL: ${testName}`)
      if (detail) console.error(`   Detail:`, detail)
      failed++
    }
  }

  // -------------------------------------------------------------
  // PENGUJIAN 1: FILTER IDENTITAS KOSONG & HANYA SPASI
  // -------------------------------------------------------------
  console.log("--- PENGUJIAN 1: Filter Identitas Kosong & Hanya Spasi ---")
  const batchWithEmpty: ParsedStudentRow[] = [
    { noAbs: 1, nisn: "0089123001", identityType: "NISN", nama: "Siswa Valid", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 2, nisn: "", identityType: "TIDAK_ADA", nama: "Siswa Kosong", gender: "Perempuan", status: "HADIR" },
    { noAbs: 3, nisn: "   ", identityType: "TIDAK_ADA", nama: "Siswa Spasi", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 4, nisn: "12867", identityType: "NIS", nama: "Siswa NIS Valid", gender: "Perempuan", status: "HADIR" },
  ]

  const resEmptyFilter = validateStudentsForSave(batchWithEmpty)
  assert(
    resEmptyFilter.totalValid === 2 &&
      resEmptyFilter.totalRejected === 2 &&
      resEmptyFilter.rejectionReasonsSummary.emptyIdentity === 2,
    "Baris tanpa identitas dan hanya spasi disaring keluar dari daftar simpan",
    {
      totalValid: resEmptyFilter.totalValid,
      rejectedStudents: resEmptyFilter.rejectedStudents.map((r) => ({ nama: r.nama, reason: r.reason })),
    }
  )

  // -------------------------------------------------------------
  // PENGUJIAN 2: PENANGANAN IDENTITAS DUPLIKAT DALAM BERKAS
  // -------------------------------------------------------------
  console.log("\n--- PENGUJIAN 2: Penanganan Identitas Duplikat dalam Berkas ---")
  const batchWithDuplicates: ParsedStudentRow[] = [
    { noAbs: 1, nisn: "12867", identityType: "NIS", nama: "Budi Santoso", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 2, nisn: "12867", identityType: "NIS", nama: "Budi Duplikat", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 3, nisn: "0089123001", identityType: "NISN", nama: "Citra Dewi", gender: "Perempuan", status: "HADIR" },
  ]

  const resDupFilter = validateStudentsForSave(batchWithDuplicates)
  assert(
    resDupFilter.totalValid === 1 &&
      resDupFilter.totalRejected === 2 &&
      resDupFilter.rejectionReasonsSummary.duplicateIdentity === 2 &&
      resDupFilter.validStudents[0].nama === "Citra Dewi",
    "Identitas duplikat ('12867') ditolak dari daftar simpan guna mencegah data ganda / penimpaan tidak sengaja",
    {
      validCount: resDupFilter.totalValid,
      validNama: resDupFilter.validStudents[0]?.nama,
      rejected: resDupFilter.rejectedStudents.map((r) => ({ nama: r.nama, reason: r.reason })),
    }
  )

  // -------------------------------------------------------------
  // PENGUJIAN 3: PRESERVASI NOL DI DEPAN PADA VALIDASI
  // -------------------------------------------------------------
  console.log("\n--- PENGUJIAN 3: Preservasi Nol di Depan pada Validasi ---")
  const batchLeadingZero: ParsedStudentRow[] = [
    { noAbs: 1, nisn: "0089123001", identityType: "NISN", nama: "Ahmad", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 2, nisn: "00123", identityType: "NIS", nama: "Beni", gender: "Laki-laki", status: "HADIR" },
  ]

  const resLeadingZero = validateStudentsForSave(batchLeadingZero)
  assert(
    resLeadingZero.totalValid === 2 &&
      resLeadingZero.validStudents[0].nisn === "0089123001" &&
      resLeadingZero.validStudents[1].nisn === "00123",
    "Identitas dengan nol di depan ('0089123001' & '00123') dipertahankan persis sebagai teks",
    { nisn1: resLeadingZero.validStudents[0].nisn, nisn2: resLeadingZero.validStudents[1].nisn }
  )

  // -------------------------------------------------------------
  // PENGUJIAN 4: UJI ALUR SIMPAN PRODUKSI (VALIDASI -> SUPABASE -> CACHE)
  // -------------------------------------------------------------
  console.log("\n--- PENGUJIAN 4: Alur Simpan Produksi (Validasi -> Supabase -> Cache) ---")
  const mockLocalStorageStore: Record<string, string> = {}
  let localStorageShouldThrow = false

  const mockLocalStorage = {
    getItem: (key: string): string | null => mockLocalStorageStore[key] || null,
    setItem: (key: string, value: string): void => {
      if (localStorageShouldThrow) {
        throw new Error("QuotaExceededError: Batas kapasitas penyimpanan browser terlampaui.")
      }
      mockLocalStorageStore[key] = value
    },
  }

  // Uji fungsi produksi: validasi -> simpan Supabase -> mergeStudentsCache
  const mixedData: ParsedStudentRow[] = [
    { noAbs: 1, nisn: "0089123001", identityType: "NISN", nama: "Ahmad", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 2, nisn: "", identityType: "TIDAK_ADA", nama: "Siswa Tanpa ID", gender: "Perempuan", status: "HADIR" },
    { noAbs: 3, nisn: "12867", nis: "12867", identityType: "NIS", nama: "Budi 1", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 4, nisn: "12867", nis: "12867", identityType: "NIS", nama: "Budi 2", gender: "Laki-laki", status: "HADIR" },
  ]

  // Mock client Supabase sukses
  const mockLocalClient = {
    from: () => ({
      select: () => ({
        in: async () => ({ data: [], error: null }),
      }),
      upsert: async () => ({ error: null }),
    }),
  }

  // 4a. Jalankan alur produksi asli
  const validationResult = validateStudentsForSave(mixedData)
  const supabaseResult = await studentService.saveMigratedStudents(
    validationResult.validStudents,
    "9a",
    "Devy, S.Pd.",
    mockLocalClient
  )

  let cacheWriteError = false
  if (supabaseResult.success) {
    try {
      const existing = mockLocalStorage.getItem("saguru_migrated_students")
      const existingMap: Record<string, CachedStudentItem[]> = existing ? JSON.parse(existing) : {}
      const updatedMap = mergeStudentsCache(existingMap, "9a", validationResult.validStudents)
      mockLocalStorage.setItem("saguru_migrated_students", JSON.stringify(updatedMap))
    } catch {
      cacheWriteError = true
    }
  }

  const savedInLocalStorage: Record<string, CachedStudentItem[]> = JSON.parse(
    mockLocalStorage.getItem("saguru_migrated_students") || "{}"
  )
  const saved9a = savedInLocalStorage["9a"] || []

  assert(
    supabaseResult.success === true &&
      validationResult.totalValid === 1 &&
      validationResult.totalRejected === 3 &&
      !cacheWriteError &&
      saved9a.length === 1 &&
      saved9a[0].nisn === "0089123001" &&
      saved9a[0].nama === "Ahmad",
    "Alur produksi menyimpan siswa valid ke Supabase & cache; baris tanpa ID & duplikat ditolak",
    {
      savedCount: validationResult.totalValid,
      rejectedCount: validationResult.totalRejected,
      savedInStorage: saved9a,
    }
  )

  // 4b. Uji penanganan kegagalan localStorage saat server Supabase berhasil
  localStorageShouldThrow = true
  let cacheWarningCaught = false
  const singleStudent: ParsedStudentRow[] = [
    { noAbs: 1, nisn: "0089123002", identityType: "NISN", nama: "Siti", gender: "Perempuan", status: "HADIR" },
  ]
  const valSingle = validateStudentsForSave(singleStudent)
  const serverSaveRes = await studentService.saveMigratedStudents(
    valSingle.validStudents,
    "9a",
    "Devy, S.Pd.",
    mockLocalClient
  )

  if (serverSaveRes.success) {
    try {
      const existing = mockLocalStorage.getItem("saguru_migrated_students")
      const existingMap: Record<string, CachedStudentItem[]> = existing ? JSON.parse(existing) : {}
      const updatedMap = mergeStudentsCache(existingMap, "9a", valSingle.validStudents)
      mockLocalStorage.setItem("saguru_migrated_students", JSON.stringify(updatedMap))
    } catch (err: unknown) {
      cacheWarningCaught = true
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`   [Info] Server berhasil, cache gagal: ${msg}`)
    }
  }

  assert(
    serverSaveRes.success === true && cacheWarningCaught === true,
    "Kegagalan cache saat server berhasil: Server tetap sukses dan peringatan cache ditangkap",
    { serverSuccess: serverSaveRes.success, cacheWarningCaught }
  )

  // -------------------------------------------------------------
  // PENGUJIAN 5: UJI KOMPATIBILITAS & SANITASI studentService.saveMigratedStudents
  // -------------------------------------------------------------
  console.log("\n--- PENGUJIAN 5: Kompatibilitas Service & Sanitasi Payload Supabase ---")
  const originalFrom = supabase.from.bind(supabase)
  let capturedPayload: UpsertRecord[] = []
  let mockSupabaseError = false

  const mockSupabaseProxy = {
    from: (tableName: string) => {
      if (tableName === "students") {
        return {
          select: () => ({
            in: async () => ({ data: [], error: null }),
          }),
          upsert: async (payload: UpsertRecord[]) => {
            capturedPayload = payload
            if (mockSupabaseError) {
              return { error: { message: "Simulasi DB Error" } }
            }
            return { error: null }
          },
        }
      }
      return originalFrom(tableName)
    },
  }

  // 5a. Sanitasi payload: memastikan 'nis' dan 'identityType' tidak masuk payload Supabase
  const testBatch: ParsedStudentRow[] = [
    { noAbs: 1, nisn: "0089123001", nis: "12867", identityType: "NISN", nama: "Hadi", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 2, nisn: "", identityType: "TIDAK_ADA", nama: "Kosong", gender: "Perempuan", status: "HADIR" },
  ]

  mockSupabaseError = false
  const serviceRes = await studentService.saveMigratedStudents(
    testBatch,
    "9a",
    "Devy, S.Pd.",
    mockSupabaseProxy
  )

  const hasNisKey = capturedPayload.some((item) => "nis" in item)
  const hasIdentityTypeKey = capturedPayload.some((item) => "identityType" in item)
  const hasAllowedKeysOnly = capturedPayload.every((item) => {
    const keys = Object.keys(item)
    return keys.every((k) => ["nisn", "nama", "gender", "kelas_code", "wali_kelas"].includes(k))
  })

  assert(
    serviceRes.success === true &&
      capturedPayload.length === 1 &&
      capturedPayload[0].nisn === "0089123001" &&
      !hasNisKey &&
      !hasIdentityTypeKey &&
      hasAllowedKeysOnly,
    "Service menyaring identitas kosong dan memformat payload HANYA dengan kolom resmi Supabase (nis & identityType disaring)",
    {
      returnValue: serviceRes,
      capturedPayload,
    }
  )

  // 5b. Batch tanpa siswa valid: harus return false tanpa memanggil Supabase
  capturedPayload = []
  const invalidServiceBatch: ParsedStudentRow[] = [
    { noAbs: 1, nisn: "", identityType: "TIDAK_ADA", nama: "Tanpa ID", gender: "Laki-laki", status: "HADIR" },
  ]
  const invalidServiceRes = await studentService.saveMigratedStudents(
    invalidServiceBatch,
    "9a",
    "Devy, S.Pd.",
    mockSupabaseProxy
  )

  assert(
    invalidServiceRes.success === false && capturedPayload.length === 0,
    "Batch tanpa siswa valid ditolak oleh service (success: false) tanpa memanggil Supabase",
    { returnValue: invalidServiceRes }
  )

  // 5c. DB failure: return false
  mockSupabaseError = true
  const failServiceRes = await studentService.saveMigratedStudents(
    [{ noAbs: 1, nisn: "0089123001", identityType: "NISN", nama: "Hadi", gender: "Laki-laki", status: "HADIR" }],
    "9a",
    "Devy, S.Pd.",
    mockSupabaseProxy
  )

  assert(
    failServiceRes.success === false,
    "Kegagalan Supabase mengembalikan success: false secara konsisten",
    { returnValue: failServiceRes }
  )

  console.log("\n=======================================================")
  console.log(`HASIL AKHIR PENGUJIAN: ${passed} LULUS, ${failed} GAGAL`)
  console.log("=======================================================")

  if (failed > 0) process.exit(1)
}

runStoragePathTests().catch((err: unknown) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
