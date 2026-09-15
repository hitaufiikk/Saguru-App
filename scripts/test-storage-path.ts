import { supabase } from "../src/lib/supabase"
import { studentService } from "../src/lib/services/studentService"
import { validateStudentsForSave, ParsedStudentRow } from "../src/lib/import-utils"

async function runStoragePathTests() {
  console.log("=======================================================")
  console.log("🧪 PENGUJIAN JALUR PENYIMPANAN PRODUKSI (MOCK SUPABASE)")
  console.log("=======================================================\n")

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
  const sampleEmpty: ParsedStudentRow[] = [
    { noAbs: 1, nisn: "0089123001", identityType: "NISN", nama: "Siswa Valid 1", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 2, nisn: "", identityType: "TIDAK_ADA", nama: "Siswa Kosong", gender: "Perempuan", status: "HADIR" },
    { noAbs: 3, nisn: "   ", identityType: "TIDAK_ADA", nama: "Siswa Spasi", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 4, nisn: "00128", nis: "00128", identityType: "NIS", nama: "Siswa Valid 2", gender: "Perempuan", status: "HADIR" },
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
  console.log("\n--- PENGUJIAN 2: Penanganan Identitas Duplikat ---")
  const sampleDuplicate: ParsedStudentRow[] = [
    { noAbs: 1, nisn: "12867", nis: "12867", identityType: "NIS", nama: "Budi Santoso", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 2, nisn: "12867", nis: "12867", identityType: "NIS", nama: "Budi Duplikat", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 3, nisn: "12868", nis: "12868", identityType: "NIS", nama: "Citra Dewi", gender: "Perempuan", status: "HADIR" },
  ]

  const valDup = validateStudentsForSave(sampleDuplicate)

  assert(
    valDup.totalValid === 1 &&
      valDup.totalRejected === 2 &&
      valDup.validStudents[0].nisn === "12868" &&
      valDup.validStudents[0].nama === "Citra Dewi" &&
      valDup.rejectionReasonsSummary.duplicateIdentity === 2,
    "Identitas duplikat ('12867') ditolak dari daftar simpan guna mencegah penimpaan data tidak sengaja",
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
  const sampleLeadingZeros: ParsedStudentRow[] = [
    { noAbs: 1, nisn: "0089123001", identityType: "NISN", nama: "Fajar", gender: "Laki-laki", status: "HADIR" },
    { noAbs: 2, nisn: "00123", nis: "00123", identityType: "NIS", nama: "Gita", gender: "Perempuan", status: "HADIR" },
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
  // PENGUJIAN 4: UJI MOCK SUPABASE PADA studentService.saveMigratedStudents
  // -------------------------------------------------------------
  console.log("\n--- PENGUJIAN 4: Uji Mock Supabase - Payload & Penolakan ---")

  // Simpan method asli Supabase
  const originalFrom = supabase.from.bind(supabase)

  let capturedPayload: any[] = []
  let capturedUpsertOptions: any = null
  let mockShouldFail = false

  // Pasang mock client Supabase
  ;(supabase as any).from = (tableName: string) => {
    if (tableName === "students") {
      return {
        upsert: async (payload: any[], options?: any) => {
          capturedPayload = payload
          capturedUpsertOptions = options
          if (mockShouldFail) {
            return { data: null, error: { message: "Simulasi Kegagalan Jaringan / Database RLS Error" } }
          }
          return { data: payload, error: null }
        },
      }
    }
    return originalFrom(tableName)
  }

  try {
    // 4a. Uji payload Supabase (memastikan 'nis' dan 'identityType' TIDAK dikirim)
    const mixedStudents: ParsedStudentRow[] = [
      { noAbs: 1, nisn: "0089123001", nis: "12867", identityType: "NISN", nama: "Hadi Pranoto", gender: "Laki-laki", status: "HADIR" },
      { noAbs: 2, nisn: "00128", nis: "00128", identityType: "NIS", nama: "Intan Permata", gender: "Perempuan", status: "HADIR" },
      { noAbs: 3, nisn: "", identityType: "TIDAK_ADA", nama: "Siswa Tanpa ID", gender: "Laki-laki", status: "HADIR" }, // Harus disaring
      { noAbs: 4, nisn: "00128", nis: "00128", identityType: "NIS", nama: "Intan Duplikat", gender: "Perempuan", status: "HADIR" }, // Duplikat dengan 00128 -> Harus disaring
    ]

    mockShouldFail = false
    const resSuccess = await studentService.saveMigratedStudents(mixedStudents as any, "9a", "Devy, S.Pd.")

    // Analisis payload yang terkirim ke mock Supabase
    const hasNisKey = capturedPayload.some((item) => "nis" in item)
    const hasIdentityTypeKey = capturedPayload.some((item) => "identityType" in item)
    const hasAllowedKeysOnly = capturedPayload.every((item) => {
      const keys = Object.keys(item)
      return keys.every((k) => ["nisn", "nama", "gender", "kelas_code", "wali_kelas"].includes(k))
    })

    assert(
      resSuccess.success === true &&
        resSuccess.count === 1 && // Hanya Hadi Pranoto yang valid (Intan duplikat, Siswa Tanpa ID kosong)
        capturedPayload.length === 1 &&
        capturedPayload[0].nisn === "0089123001" &&
        capturedPayload[0].nama === "Hadi Pranoto" &&
        capturedPayload[0].kelas_code === "9a" &&
        !hasNisKey &&
        !hasIdentityTypeKey &&
        hasAllowedKeysOnly,
      "Payload Supabase hanya memuat kolom skema resmi (nis & identityType tidak dikirim, baris kosong/duplikat dicegah)",
      {
        returnedResult: resSuccess,
        capturedSupabasePayload: capturedPayload,
        hasNisKey,
        hasIdentityTypeKey,
      }
    )

    // 4b. Uji jika seluruh siswa tidak valid (tidak ada identitas / semuanya duplikat)
    capturedPayload = []
    const invalidBatch: ParsedStudentRow[] = [
      { noAbs: 1, nisn: "", identityType: "TIDAK_ADA", nama: "Tanpa ID 1", gender: "Laki-laki", status: "HADIR" },
      { noAbs: 2, nisn: "  ", identityType: "TIDAK_ADA", nama: "Tanpa ID 2", gender: "Perempuan", status: "HADIR" },
    ]

    const resAllInvalid = await studentService.saveMigratedStudents(invalidBatch as any, "9a", "Devy, S.Pd.")

    assert(
      resAllInvalid.success === false &&
        resAllInvalid.count === 0 &&
        capturedPayload.length === 0,
      "Batch tanpa identitas ditolak sebelum mencapai Supabase (mock Supabase tidak dipanggil)",
      resAllInvalid
    )

    // 4c. Uji kegagalan database: harus mengembalikan success: false, tidak boleh dilaporkan sukses
    mockShouldFail = true
    const validBatch: ParsedStudentRow[] = [
      { noAbs: 1, nisn: "0089123099", identityType: "NISN", nama: "Joko", gender: "Laki-laki", status: "HADIR" },
    ]

    const resFailure = await studentService.saveMigratedStudents(validBatch as any, "9a", "Devy, S.Pd.")

    assert(
      resFailure.success === false &&
        resFailure.count === 0 &&
        typeof resFailure.error === "string" &&
        resFailure.error.includes("Simulasi Kegagalan"),
      "Kegagalan Supabase dilaporkan secara jujur (success: false), tidak ditampilkan sebagai keberhasilan",
      resFailure
    )
  } finally {
    // Pulihkan mock
    ;(supabase as any).from = originalFrom
  }

  console.log("\n=======================================================")
  console.log(`HASIL AKHIR PENGUJIAN STORAGE PATH: ${passed} LULUS, ${failed} GAGAL`)
  console.log("=======================================================")

  if (failed > 0) process.exit(1)
}

runStoragePathTests().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
