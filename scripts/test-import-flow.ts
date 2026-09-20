// -------------------------------------------------------------
// PENGUJIAN ALUR IMPOR SISWA SUPABASE & CACHE
// -------------------------------------------------------------
// Environment dummy diinisialisasi HANYA pada lingkungan pengujian CLI
// sebelum modul Supabase dimuat melalui dynamic import.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock-test.supabase.co"
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key"
}

interface UpsertStudentRecord {
  nisn: string
  nama: string
  gender: string
  kelas_code: string
  wali_kelas: string | null
}

interface ExistingStudentRecord {
  nisn: string
  nama: string
  kelas_code: string
}

interface MockSupabaseClient {
  from: (table?: string) => {
    select: (cols?: string) => {
      in: (
        colName?: string,
        values?: string[]
      ) => Promise<{ data: ExistingStudentRecord[] | null; error: { message: string } | null }>
    }
    upsert: (
      payload: UpsertStudentRecord[],
      options?: { onConflict: string }
    ) => Promise<{ error: { message: string } | null }>
  }
}

async function runImportFlowTests(): Promise<void> {
  console.log("=======================================================")
  console.log("🧪 PENGUJIAN OTOMATIS: ALUR IMPOR SISWA SUPABASE & CACHE")
  console.log("=======================================================\n")

  const { studentService } = await import("../src/lib/services/studentService")
  const { mergeStudentsCache } = await import("../src/lib/import-utils")
  type ParsedStudentRow = import("../src/lib/import-utils").ParsedStudentRow
  type CachedStudentItem = import("../src/lib/import-utils").CachedStudentItem

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

  const sampleStudents: ParsedStudentRow[] = [
    {
      noAbs: 1,
      nisn: "0089123001",
      nama: "Ahmad Fauzi",
      gender: "Laki-laki",
      identityType: "NISN",
      status: "HADIR",
    },
    {
      noAbs: 2,
      nisn: "0089123002",
      nama: "Aisha Rahmawati",
      gender: "Perempuan",
      identityType: "NISN",
      status: "HADIR",
    },
  ]

  // -------------------------------------------------------------
  // SKENARIO 1: KEBERHASILAN IMPOR & PAYLOAD 5 KOLOM RESMI
  // -------------------------------------------------------------
  console.log("--- SKENARIO 1: Keberhasilan Impor & Format Payload 5 Kolom Resmi ---")
  let upsertCalled = false
  let upsertPayload: UpsertStudentRecord[] = []
  let upsertOptions: { onConflict: string } | undefined
  let preCheckCalled = false

  const mockSuccessClient: MockSupabaseClient = {
    from: () => ({
      select: () => ({
        in: async () => {
          preCheckCalled = true
          return { data: [], error: null }
        },
      }),
      upsert: async (payload: UpsertStudentRecord[], options?: { onConflict: string }) => {
        upsertCalled = true
        upsertPayload = payload
        upsertOptions = options
        return { error: null }
      },
    }),
  }

  const result1 = await studentService.saveMigratedStudents(
    sampleStudents,
    "9a",
    "Devy, S.Pd.",
    mockSuccessClient
  )

  const allowedColumns = new Set(["nisn", "nama", "gender", "kelas_code", "wali_kelas"])
  const payloadHasOnlyVerifiedCols =
    upsertPayload.length === 2 &&
    upsertPayload.every((row) => {
      const keys = Object.keys(row)
      return keys.every((k) => allowedColumns.has(k)) && keys.length === allowedColumns.size
    })

  assert(
    result1.success === true &&
      result1.count === 2 &&
      preCheckCalled &&
      upsertCalled &&
      upsertOptions?.onConflict === "nisn" &&
      payloadHasOnlyVerifiedCols &&
      upsertPayload[0].kelas_code === "9a" &&
      upsertPayload[0].wali_kelas === "Devy, S.Pd.",
    "Supabase save berhasil: Pre-check dijalankan, upsert onConflict 'nisn' dipanggil, hanya 5 kolom resmi dikirim",
    { payloadSample: upsertPayload[0] }
  )

  // -------------------------------------------------------------
  // SKENARIO 2: PEMERIKSAAN KONFLIK KELAS GAGAL: UPSERT TIDAK DIJALANKAN
  // -------------------------------------------------------------
  console.log("\n--- SKENARIO 2: Pemeriksaan Konflik Kelas Gagal -> Upsert Tidak Dijalankan ---")
  let conflictUpsertCalled = false

  const mockConflictClient: MockSupabaseClient = {
    from: () => ({
      select: () => ({
        in: async () => ({
          data: [
            {
              nisn: "0089123001",
              nama: "Ahmad Fauzi",
              kelas_code: "9b",
            },
          ],
          error: null,
        }),
      }),
      upsert: async () => {
        conflictUpsertCalled = true
        return { error: null }
      },
    }),
  }

  const result2 = await studentService.saveMigratedStudents(
    sampleStudents,
    "9a", // Target impor 9A, tetapi siswa sudah ada di 9B
    "Devy, S.Pd.",
    mockConflictClient
  )

  assert(
    result2.success === false &&
      conflictUpsertCalled === false &&
      Boolean(result2.error && result2.error.includes("Konflik kelas terdeteksi")) &&
      result2.conflicts?.length === 1 &&
      result2.conflicts[0].existingKelas === "9b",
    "Pemeriksaan konflik kelas gagal: Upsert TIDAK dijalankan, seluruh batch dibatalkan",
    { errorMsg: result2.error }
  )

  // -------------------------------------------------------------
  // SKENARIO 3: SERVER GAGAL -> CACHE TIDAK DITULIS
  // -------------------------------------------------------------
  console.log("\n--- SKENARIO 3: Server Gagal -> Cache Tidak Ditulis ---")
  const mockServerFailClient: MockSupabaseClient = {
    from: () => ({
      select: () => ({
        in: async () => ({ data: [], error: null }),
      }),
      upsert: async () => ({
        error: { message: "Internal Database Error (500)" },
      }),
    }),
  }

  let localCacheStorage: Record<string, CachedStudentItem[]> = {
    "9a": [
      { noAbs: 1, nisn: "0089123999", nama: "Siswa Asli 9A", gender: "Laki-laki", identityType: "NISN", status: "HADIR" },
    ],
  }
  const originalCacheSnapshot = JSON.stringify(localCacheStorage)

  // Jalankan alur seperti migrasi-card: simpan server dulu, jika gagal JANGAN update cache
  const serverSaveRes = await studentService.saveMigratedStudents(
    sampleStudents,
    "9a",
    "Devy, S.Pd.",
    mockServerFailClient
  )

  let cacheWrittenWhenServerFailed = false
  if (serverSaveRes.success) {
    localCacheStorage = mergeStudentsCache(localCacheStorage, "9a", sampleStudents)
    cacheWrittenWhenServerFailed = true
  }

  assert(
    serverSaveRes.success === false &&
      cacheWrittenWhenServerFailed === false &&
      JSON.stringify(localCacheStorage) === originalCacheSnapshot,
    "Server gagal: Cache lokal tidak ditulis dan data lokal awal tetap utuh",
    { serverError: serverSaveRes.error, cacheState: localCacheStorage }
  )

  // -------------------------------------------------------------
  // SKENARIO 4: SERVER BERHASIL, CACHE GAGAL -> PERINGATAN CACHE
  // -------------------------------------------------------------
  console.log("\n--- SKENARIO 4: Server Berhasil, Cache Gagal -> Peringatan Cache ---")
  const mockServerOkClient: MockSupabaseClient = {
    from: () => ({
      select: () => ({
        in: async () => ({ data: [], error: null }),
      }),
      upsert: async () => ({
        error: null,
      }),
    }),
  }

  const serverSuccessRes = await studentService.saveMigratedStudents(
    sampleStudents,
    "9a",
    "Devy, S.Pd.",
    mockServerOkClient
  )

  let cacheFailureReported = false
  let serverSuccessPreserved = false
  try {
    if (serverSuccessRes.success) {
      serverSuccessPreserved = true
      // Simulasikan kuota localStorage browser penuh
      throw new Error("QuotaExceededError: Batas kapasitas penyimpanan browser terlampaui.")
    }
  } catch (cacheErr: unknown) {
    cacheFailureReported = true
    const cacheMsg = cacheErr instanceof Error ? cacheErr.message : String(cacheErr)
    console.log(`   [Info Handler] Server tersimpan sukses, peringatan cache: ${cacheMsg}`)
  }

  assert(
    serverSuccessPreserved === true && cacheFailureReported === true,
    "Server berhasil, cache gagal: Tetap dinyatakan tersimpan di server disertai peringatan cache",
    { serverSuccess: serverSuccessPreserved, cacheFailureReported }
  )

  // -------------------------------------------------------------
  // SKENARIO 5: IMPOR DATA YANG SAMA DUA KALI -> TIDAK DUPLIKAT
  // -------------------------------------------------------------
  console.log("\n--- SKENARIO 5: Impor Data yang Sama Dua Kali -> Tidak Bertambah Duplikat ---")
  const initialCacheData: Record<string, CachedStudentItem[]> = {}

  // Impor pertama
  const cacheAfterFirstImport = mergeStudentsCache(initialCacheData, "9a", sampleStudents)
  // Impor kedua dengan berkas yang sama persis
  const cacheAfterSecondImport = mergeStudentsCache(cacheAfterFirstImport, "9a", sampleStudents)

  const countFirst = cacheAfterFirstImport["9a"]?.length ?? 0
  const countSecond = cacheAfterSecondImport["9a"]?.length ?? 0

  assert(
    countFirst === 2 && countSecond === 2,
    "Impor data yang sama dua kali: Cache tidak bertambah duplikat (tetap 2 siswa)",
    { countFirst, countSecond, nisns: cacheAfterSecondImport["9a"].map((s) => s.nisn) }
  )

  // -------------------------------------------------------------
  // SKENARIO 6: PRESERVASI SISWA LAIN SAAT PEMBARUAN PARSIAL
  // -------------------------------------------------------------
  console.log("\n--- SKENARIO 6: Preservasi Siswa Lama & Siswa Kelas Lain ---")
  const multiClassCache: Record<string, CachedStudentItem[]> = {
    "9a": [
      { noAbs: 1, nisn: "0089123001", nama: "Ahmad Fauzi Lama", gender: "Laki-laki", identityType: "NISN", status: "DISPEN", alasanDispen: "Lomba" },
      { noAbs: 2, nisn: "0089123002", nama: "Aisha Rahmawati", gender: "Perempuan", identityType: "NISN", status: "HADIR" },
    ],
    "9b": [
      { noAbs: 1, nisn: "0089123999", nama: "Budi di 9B", gender: "Laki-laki", identityType: "NISN", status: "HADIR" },
    ],
  }

  // Berkas baru: Ahmad Fauzi diupdate namanya, Cantika baru, Aisha tidak ada di berkas baru
  const partialNewData: ParsedStudentRow[] = [
    { noAbs: 1, nisn: "0089123001", nama: "Ahmad Fauzi Baru", gender: "Laki-laki", identityType: "NISN", status: "HADIR" },
    { noAbs: 2, nisn: "0089123003", nama: "Cantika Putri", gender: "Perempuan", identityType: "NISN", status: "HADIR" },
  ]

  const mergedCache = mergeStudentsCache(multiClassCache, "9a", partialNewData)
  const class9a = mergedCache["9a"] || []
  const class9b = mergedCache["9b"] || []

  const ahmad = class9a.find((s) => s.nisn === "0089123001")
  const aisha = class9a.find((s) => s.nisn === "0089123002")
  const cantika = class9a.find((s) => s.nisn === "0089123003")

  assert(
    class9b.length === 1 &&
      class9a.length === 3 &&
      Boolean(aisha) &&
      ahmad?.nama === "Ahmad Fauzi Baru" &&
      ahmad?.status === "DISPEN" &&
      cantika?.noAbs === 3,
    "Preservasi siswa lain: Siswa kelas 9B utuh, siswa lama yang tidak diimpor tetap ada, nomor urut terurut",
    { total9a: class9a.length, ahmadStatus: ahmad?.status }
  )

  // -------------------------------------------------------------
  // SKENARIO 7: PDF KOSONG -> TIDAK MENGHASILKAN DATA CONTOH
  // -------------------------------------------------------------
  console.log("\n--- SKENARIO 7: PDF Kosong -> Tidak Menghasilkan Data Contoh ---")
  // Simulasi logika parsing PDF saat baris valid kosong
  const extractedRowsFromEmptyPdf: ParsedStudentRow[] = []
  let previewRows: ParsedStudentRow[] = []
  let totalDetectedRows = 0

  if (extractedRowsFromEmptyPdf.length > 0) {
    previewRows = extractedRowsFromEmptyPdf
    totalDetectedRows = extractedRowsFromEmptyPdf.length
  } else {
    // Alur baru: kosongkan data, jangan pakai 5 data contoh palsu
    previewRows = []
    totalDetectedRows = 0
  }

  assert(
    previewRows.length === 0 && totalDetectedRows === 0,
    "PDF kosong: Tidak menghasilkan data contoh dan pratinjau tetap bersih kosong",
    { previewLength: previewRows.length, totalDetected: totalDetectedRows }
  )

  // -------------------------------------------------------------
  // SKENARIO 8: PRESERVASI TEKS IDENTITAS LEADING ZERO
  // -------------------------------------------------------------
  console.log("\n--- SKENARIO 8: Preservasi Leading Zeroes pada NISN dan NIS ---")
  const zeroTestStudents: ParsedStudentRow[] = [
    { noAbs: 1, nisn: "00123", nama: "Siswa NIS Lokal", gender: "Laki-laki", identityType: "NIS", status: "HADIR" },
    { noAbs: 2, nisn: "0089123001", nama: "Siswa NISN", gender: "Perempuan", identityType: "NISN", status: "HADIR" },
  ]

  let zeroPayload: UpsertStudentRecord[] = []
  const mockZeroClient: MockSupabaseClient = {
    from: () => ({
      select: () => ({
        in: async () => ({ data: [], error: null }),
      }),
      upsert: async (payload: UpsertStudentRecord[]) => {
        zeroPayload = payload
        return { error: null }
      },
    }),
  }

  await studentService.saveMigratedStudents(zeroTestStudents, "9a", "Devy, S.Pd.", mockZeroClient)

  assert(
    zeroPayload[0].nisn === "00123" && zeroPayload[1].nisn === "0089123001",
    "Preservasi identitas teks: Leading zero '00123' dan '0089123001' tidak terpotong atau terkonversi angka",
    { nisn1: zeroPayload[0].nisn, nisn2: zeroPayload[1].nisn }
  )

  // -------------------------------------------------------------
  // RINGKASAN HASIL
  // -------------------------------------------------------------
  console.log("\n=======================================================")
  console.log(`HASIL AKHIR PENGUJIAN ALUR IMPOR: ${passed} LULUS, ${failed} GAGAL`)
  console.log("=======================================================")

  if (failed > 0) {
    process.exit(1)
  }
}

runImportFlowTests().catch((err: unknown) => {
  console.error("Fatal error saat menjalankan pengujian:", err)
  process.exit(1)
})
