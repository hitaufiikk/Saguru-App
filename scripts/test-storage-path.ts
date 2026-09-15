// -------------------------------------------------------------
// PENGUJIAN JALUR PENYIMPANAN SAGURU-APP (TEST STORAGE PATH)
// -------------------------------------------------------------
// Catatan: Variabel lingkungan mock diinisialisasi HANYA pada lingkungan
// pengujian untuk mencegah error inisialisasi @supabase/supabase-js pada runner CLI,
// tanpa memodifikasi berkas konfigurasi produksi src/lib/supabase.ts.

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock-test.supabase.co"
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key"
}

async function runStoragePathTests() {
  console.log("=======================================================")
  console.log("🧪 PENGUJIAN JALUR PENYIMPANAN: LOCALSTORAGE & SERVICE")
  console.log("=======================================================\n")

  // Dynamic import agar process.env sudah terpasang sebelum supabase diinisialisasi
  const { validateStudentsForSave } = await import("../src/lib/import-utils")
  const { studentService } = await import("../src/lib/services/studentService")
  const { supabase } = await import("../src/lib/supabase")

  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string, detail?: any) {
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
  // PENGUJIAN 1: VALIDASI PRA-SIMPAN IDENTITAS KOSONG & HANYA SPASI
  // -------------------------------------------------------------
  console.log("--- PENGUJIAN 1: Filter Identitas Kosong & Hanya Spasi ---")
  const sampleEmpty = [
    { noAbs: 1, nisn: "0089123001", identityType: "NISN" as const, nama: "Siswa Valid 1", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 2, nisn: "", identityType: "TIDAK_ADA" as const, nama: "Siswa Kosong", gender: "Perempuan", status: "HADIR" },
    { noAbs: 3, nisn: "   ", identityType: "TIDAK_ADA" as const, nama: "Siswa Spasi", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 4, nisn: "00128", nis: "00128", identityType: "NIS" as const, nama: "Siswa Valid 2", gender: "Perempuan", status: "HADIR" },
  ]

  const valEmpty = validateStudentsForSave(sampleEmpty)

  assert(
    valEmpty.totalValid === 2 &&
      valEmpty.totalRejected === 2 &&
      valEmpty.validStudents[0].nisn === "0089123001" &&
      valEmpty.validStudents[1].nisn === "00128" &&
      valEmpty.rejectionReasonsSummary.emptyIdentity === 2,
    "Baris tanpa identitas dan hanya spasi disaring keluar dari daftar simpan",
    {
      totalValid: valEmpty.totalValid,
      rejectedStudents: valEmpty.rejectedStudents.map((r) => ({ nama: r.nama, reason: r.reason })),
    }
  )

  // -------------------------------------------------------------
  // PENGUJIAN 2: PENANGANAN IDENTITAS DUPLIKAT DI DALAM BERKAS
  // -------------------------------------------------------------
  console.log("\n--- PENGUJIAN 2: Penanganan Identitas Duplikat dalam Berkas ---")
  const sampleDuplicate = [
    { noAbs: 1, nisn: "12867", nis: "12867", identityType: "NIS" as const, nama: "Budi Santoso", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 2, nisn: "12867", nis: "12867", identityType: "NIS" as const, nama: "Budi Duplikat", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 3, nisn: "12868", nis: "12868", identityType: "NIS" as const, nama: "Citra Dewi", gender: "Perempuan", status: "HADIR" },
  ]

  const valDup = validateStudentsForSave(sampleDuplicate)

  assert(
    valDup.totalValid === 1 &&
      valDup.totalRejected === 2 &&
      valDup.validStudents[0].nisn === "12868" &&
      valDup.validStudents[0].nama === "Citra Dewi" &&
      valDup.rejectionReasonsSummary.duplicateIdentity === 2,
    "Identitas duplikat ('12867') ditolak dari daftar simpan guna mencegah data ganda / penimpaan tidak sengaja",
    {
      validCount: valDup.totalValid,
      validNama: valDup.validStudents[0]?.nama,
      rejected: valDup.rejectedStudents.map((r) => ({ nama: r.nama, reason: r.reason })),
    }
  )

  // -------------------------------------------------------------
  // PENGUJIAN 3: PRESERVASI NOL DI DEPAN PADA HASIL VALIDASI
  // -------------------------------------------------------------
  console.log("\n--- PENGUJIAN 3: Preservasi Nol di Depan pada Validasi ---")
  const sampleLeadingZeros = [
    { noAbs: 1, nisn: "0089123001", identityType: "NISN" as const, nama: "Fajar", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 2, nisn: "00123", nis: "00123", identityType: "NIS" as const, nama: "Gita", gender: "Perempuan", status: "HADIR" },
  ]

  const valZeros = validateStudentsForSave(sampleLeadingZeros)

  assert(
    valZeros.totalValid === 2 &&
      valZeros.validStudents[0].nisn === "0089123001" &&
      valZeros.validStudents[1].nisn === "00123",
    "Identitas dengan nol di depan ('0089123001' & '00123') dipertahankan persis sebagai teks",
    {
      nisn1: valZeros.validStudents[0].nisn,
      nisn2: valZeros.validStudents[1].nisn,
    }
  )

  // -------------------------------------------------------------
  // PENGUJIAN 4: UJI JALUR PENYIMPANAN TOMBOL IMPOR (LOCALSTORAGE)
  // -------------------------------------------------------------
  console.log("\n--- PENGUJIAN 4: Uji Jalur Penyimpanan Browser (localStorage) ---")

  // Mock localStorage
  const mockLocalStorageStore: Record<string, string> = {}
  let localStorageShouldThrow = false

  const mockLocalStorage = {
    getItem: (key: string) => mockLocalStorageStore[key] || null,
    setItem: (key: string, value: string) => {
      if (localStorageShouldThrow) {
        throw new Error("QuotaExceededError: Batas kapasitas penyimpanan browser terlampaui.")
      }
      mockLocalStorageStore[key] = value
    },
  }

  // Fungsi simulasi handler simpan pada migrasi-card.tsx
  function simulateMigrasiCardSubmit(
    data: any[],
    targetClass: string
  ): { success: boolean; savedCount: number; rejectedCount: number; error?: string } {
    const validation = validateStudentsForSave(data)
    if (validation.validStudents.length === 0) {
      return {
        success: false,
        savedCount: 0,
        rejectedCount: validation.totalRejected,
        error: "Tidak ada siswa dengan identitas valid yang dapat disimpan.",
      }
    }

    try {
      const existing = mockLocalStorage.getItem("saguru_migrated_students")
      const existingMap = existing ? JSON.parse(existing) : {}
      existingMap[targetClass.toLowerCase()] = validation.validStudents
      mockLocalStorage.setItem("saguru_migrated_students", JSON.stringify(existingMap))
      return {
        success: true,
        savedCount: validation.totalValid,
        rejectedCount: validation.totalRejected,
      }
    } catch (err: any) {
      return {
        success: false,
        savedCount: 0,
        rejectedCount: validation.totalRejected,
        error: err?.message,
      }
    }
  }

  // 4a. Siswa valid + siswa kosong + siswa duplikat
  const mixedData = [
    { noAbs: 1, nisn: "0089123001", identityType: "NISN" as const, nama: "Ahmad", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 2, nisn: "", identityType: "TIDAK_ADA" as const, nama: "Siswa Tanpa ID", gender: "Perempuan", status: "HADIR" },
    { noAbs: 3, nisn: "12867", nis: "12867", identityType: "NIS" as const, nama: "Budi 1", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 4, nisn: "12867", nis: "12867", identityType: "NIS" as const, nama: "Budi 2", gender: "Laki-laki", status: "HADIR" },
  ]

  localStorageShouldThrow = false
  const submitResult = simulateMigrasiCardSubmit(mixedData, "9a")

  const savedInLocalStorage = JSON.parse(mockLocalStorage.getItem("saguru_migrated_students") || "{}")
  const saved9a = savedInLocalStorage["9a"] || []

  assert(
    submitResult.success === true &&
      submitResult.savedCount === 1 &&
      submitResult.rejectedCount === 3 &&
      saved9a.length === 1 &&
      saved9a[0].nisn === "0089123001" &&
      saved9a[0].nama === "Ahmad",
    "Tombol impor menyimpan HANYA siswa valid ke localStorage; baris tanpa identitas & duplikat tidak tersimpan",
    {
      savedCount: submitResult.savedCount,
      rejectedCount: submitResult.rejectedCount,
      savedInStorage: saved9a,
    }
  )

  // 4b. Uji kegagalan localStorage (misal QuotaExceededError)
  localStorageShouldThrow = true
  const failSubmitResult = simulateMigrasiCardSubmit(
    [{ noAbs: 1, nisn: "0089123002", identityType: "NISN" as const, nama: "Siti", gender: "Perempuan", status: "HADIR" }],
    "9a"
  )

  assert(
    failSubmitResult.success === false &&
      failSubmitResult.savedCount === 0 &&
      typeof failSubmitResult.error === "string" &&
      failSubmitResult.error.includes("QuotaExceededError"),
    "Kegagalan penyimpanan localStorage ditangani dengan aman tanpa menampilkan status keberhasilan",
    failSubmitResult
  )

  // -------------------------------------------------------------
  // PENGUJIAN 5: UJI KOMPATIBILITAS & SANITASI studentService.saveMigratedStudents
  // -------------------------------------------------------------
  console.log("\n--- PENGUJIAN 5: Kompatibilitas Service & Sanitasi Payload Supabase ---")

  const originalFrom = supabase.from.bind(supabase)
  let capturedPayload: any[] = []
  let mockSupabaseError = false

  ;(supabase as any).from = (tableName: string) => {
    if (tableName === "students") {
      return {
        upsert: async (payload: any[]) => {
          capturedPayload = payload
          if (mockSupabaseError) {
            return { data: null, error: { message: "Simulasi DB Error" } }
          }
          return { data: payload, error: null }
        },
      }
    }
    return originalFrom(tableName)
  }

  try {
    // 5a. Payload sanitization: memastikan 'nis' dan 'identityType' tidak masuk payload Supabase
    const testBatch = [
      { noAbs: 1, nisn: "0089123001", nis: "12867", identityType: "NISN" as const, nama: "Hadi", gender: "Laki-laki", status: "HADIR" },
      { noAbs: 2, nisn: "", identityType: "TIDAK_ADA" as const, nama: "Kosong", gender: "Perempuan", status: "HADIR" },
    ]

    mockSupabaseError = false
    const serviceRes = await studentService.saveMigratedStudents(testBatch as any, "9a", "Devy, S.Pd.")

    const hasNisKey = capturedPayload.some((item) => "nis" in item)
    const hasIdentityTypeKey = capturedPayload.some((item) => "identityType" in item)
    const hasAllowedKeysOnly = capturedPayload.every((item) => {
      const keys = Object.keys(item)
      return keys.every((k) => ["nisn", "nama", "gender", "kelas_code", "wali_kelas"].includes(k))
    })

    assert(
      serviceRes === true && // Mengembalikan boolean true sesuai signature asli
        capturedPayload.length === 1 &&
        capturedPayload[0].nisn === "0089123001" &&
        !hasNisKey &&
        !hasIdentityTypeKey &&
        hasAllowedKeysOnly,
      "Service menyaring identitas kosong dan memformat payload HANYA dengan kolom resmi Supabase (nis & identityType disaring)",
      {
        returnType: typeof serviceRes,
        returnValue: serviceRes,
        capturedPayload,
      }
    )

    // 5b. Batch tanpa siswa valid: harus return false tanpa memanggil Supabase
    capturedPayload = []
    const invalidServiceBatch = [
      { noAbs: 1, nisn: "", identityType: "TIDAK_ADA" as const, nama: "Tanpa ID", gender: "Laki-laki", status: "HADIR" },
    ]
    const invalidServiceRes = await studentService.saveMigratedStudents(invalidServiceBatch as any, "9a", "Devy, S.Pd.")

    assert(
      invalidServiceRes === false && capturedPayload.length === 0,
      "Batch tanpa siswa valid ditolak oleh service (return false) tanpa memanggil Supabase",
      { returnValue: invalidServiceRes }
    )

    // 5c. DB failure: return false
    mockSupabaseError = true
    const failServiceRes = await studentService.saveMigratedStudents(
      [{ noAbs: 1, nisn: "0089123001", identityType: "NISN" as const, nama: "Hadi", gender: "Laki-laki", status: "HADIR" }] as any,
      "9a",
      "Devy, S.Pd."
    )

    assert(
      failServiceRes === false,
      "Kegagalan Supabase mengembalikan boolean false secara konsisten dengan signature asli",
      { returnValue: failServiceRes }
    )
  } finally {
    ;(supabase as any).from = originalFrom
  }

  console.log("\n=======================================================")
  console.log(`HASIL AKHIR PENGUJIAN: ${passed} LULUS, ${failed} GAGAL`)
  console.log("=======================================================")

  if (failed > 0) process.exit(1)
}

runStoragePathTests().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
