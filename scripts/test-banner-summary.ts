import assert from "node:assert/strict"

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-anon-key"

async function runTests() {
  const { dashboardService, parseDeadlineInfo } = await import("../src/lib/services/dashboardService")

  console.log("Menjalankan test ringkasan banner dashboard...")

  // --- TEST 1: parseDeadlineInfo ---
  const today = "2026-09-22"
  const dOverdue = parseDeadlineInfo("2026-09-20", today)
  assert.equal(dOverdue.isOverdue, true, "2026-09-20 harus lewat tenggat")
  assert.equal(dOverdue.isUpcoming, false)
  assert.equal(dOverdue.hasDeadline, true)

  const dUpcoming = parseDeadlineInfo("2026-09-25", today)
  assert.equal(dUpcoming.isOverdue, false)
  assert.equal(dUpcoming.isUpcoming, true, "2026-09-25 harus mendatang")

  const dEmpty = parseDeadlineInfo("", today)
  assert.equal(dEmpty.hasDeadline, false)
  assert.equal(dEmpty.isOverdue, false)
  assert.equal(dEmpty.isUpcoming, false)

  // --- TEST 2: getClassesAttendanceSummary ---
  const mockStudents = [
    // 9A: 3 siswa
    { nisn: "001", nama: "Ahmad", kelas_code: "9a" },
    { nisn: "002", nama: "Budi", kelas_code: "9a" },
    { nisn: "003", nama: "Citra", kelas_code: "9a" },
    // 8H: 2 siswa
    { nisn: "004", nama: "Doni", kelas_code: "8h" },
    { nisn: "005", nama: "Eka", kelas_code: "8h" },
    // 9B: 2 siswa
    { nisn: "006", nama: "Fani", kelas_code: "9b" },
    { nisn: "007", nama: "Gita", kelas_code: "9b" },
    // 8I: 0 siswa
  ]

  const mockAttendance = [
    // 9A: 001 HADIR, 002 SAKIT, 003 belum ada baris
    { nisn: "001", kelas_code: "9a", status: "HADIR" },
    { nisn: "002", kelas_code: "9a", status: "SAKIT" },
    // 8H: tidak ada absensi
    // 9B: 006 HADIR, 007 DISPEN
    { nisn: "006", kelas_code: "9b", status: "HADIR" },
    { nisn: "007", kelas_code: "9b", status: "DISPEN" },
  ]

  const mockClient = {
    from(table: string) {
      return {
        select() {
          return {
            in(col: string, vals: string[]) {
              if (table === "students") {
                const filtered = mockStudents.filter((s) => vals.includes(s.kelas_code.toLowerCase()))
                return Promise.resolve({ data: filtered, error: null })
              }
              return Promise.resolve({ data: [], error: null })
            },
            eq(col: string, val: string) {
              return {
                in(col2: string, vals: string[]) {
                  if (table === "presensi") {
                    const filtered = mockAttendance.filter((a) => vals.includes(a.kelas_code.toLowerCase()))
                    return Promise.resolve({ data: filtered, error: null })
                  }
                  return Promise.resolve({ data: [], error: null })
                },
              }
            },
          }
        },
      }
    },
  } as any

  const attSummary = await dashboardService.getClassesAttendanceSummary(
    ["8i", "8h", "9a", "9b"],
    today,
    mockClient
  )

  assert.equal(attSummary.length, 4, "Harus menghasilkan 4 kelas")

  // 8I: kosong
  const s8i = attSummary.find((s) => s.kelasCode === "8i")!
  assert.equal(s8i.status, "NO_STUDENTS")
  assert.equal(s8i.totalStudents, 0)
  assert.equal(s8i.isWaliKelas, false)

  // 8H: belum dicatat sama sekali
  const s8h = attSummary.find((s) => s.kelasCode === "8h")!
  assert.equal(s8h.totalStudents, 2)
  assert.equal(s8h.recordedCount, 0)
  assert.equal(s8h.unrecordedCount, 2)
  assert.equal(s8h.hadirCount, 0)
  assert.equal(s8h.status, "NOT_RECORDED")

  // 9A: 3 siswa, 2 dicatat (1 Hadir, 1 Sakit), 1 belum
  const s9a = attSummary.find((s) => s.kelasCode === "9a")!
  assert.equal(s9a.totalStudents, 3)
  assert.equal(s9a.recordedCount, 2, "Sakit tetap dihitung sebagai tercatat")
  assert.equal(s9a.hadirCount, 1, "Hanya status HADIR yang dihitung hadir")
  assert.equal(s9a.unrecordedCount, 1)
  assert.equal(s9a.status, "RECORDED")
  assert.equal(s9a.isComplete, false)
  assert.equal(s9a.isWaliKelas, true, "9A harus ditandai sebagai wali kelas")

  // 9B: 2 siswa, 2 dicatat (1 Hadir, 1 Dispen), 0 belum
  const s9b = attSummary.find((s) => s.kelasCode === "9b")!
  assert.equal(s9b.totalStudents, 2)
  assert.equal(s9b.recordedCount, 2)
  assert.equal(s9b.hadirCount, 1, "Dispen tercatat tapi bukan hadir")
  assert.equal(s9b.unrecordedCount, 0)
  assert.equal(s9b.isComplete, true, "Pencatatan lengkap")

  console.log("✓ Uji perhitungan dan pemisahan kehadiran presensi berhasil.")

  // --- TEST 3: getPendingTasksSummary ---
  const mockTasks = [
    { id: 1, title: "[Tugas 1] Aljabar Dasar", mapel: "Matematika", kelas_code: "9a", deadline: "2026-09-20" }, // Overdue
    { id: 2, title: "[Tugas 2] Persamaan Kuadrat", mapel: "Matematika", kelas_code: "9a", deadline: "2026-09-26" }, // Upcoming
    { id: 3, title: "[UH 1] Bangun Datar", mapel: "Matematika", kelas_code: "8h", deadline: "2026-09-18" }, // Overdue earlier
    { id: 4, title: "[PR 1] Bilangan Bulat", mapel: "Matematika", kelas_code: "9b", deadline: "2026-09-23" }, // Upcoming closer
    { id: 5, title: "[Tugas 3] Tugas Tanpa Tenggat", mapel: "Matematika", kelas_code: "9a", deadline: "" }, // No deadline
    { id: 6, title: "[Tugas 4] Selesai Semua", mapel: "Matematika", kelas_code: "9b", deadline: "2026-09-21" }, // All submitted
  ]

  const mockGrades = [
    // Task 1 (9A: 3 siswa): 001 DINILAI (score 80), 002 DINILAI (score 0 -> nilal 0 tetap mengumpulkan), 003 BELUM
    { task_id: 1, nisn: "001", kelas_code: "9a", score: 80, status: "DINILAI" },
    { task_id: 1, nisn: "002", kelas_code: "9a", score: 0, status: "DINILAI" },
    { task_id: 1, nisn: "003", kelas_code: "9a", score: null, status: "BELUM" },

    // Task 2 (9A: 3 siswa): 001 KUMPUL, 002 & 003 belum
    { task_id: 2, nisn: "001", kelas_code: "9a", score: null, status: "KUMPUL" },

    // Task 3 (8H: 2 siswa): 004 TERLAMBAT, 005 belum ada nilai
    { task_id: 3, nisn: "004", kelas_code: "8h", score: null, status: "TERLAMBAT" },

    // Task 4 (9B: 2 siswa): 006 KUMPUL, 007 belum ada nilai
    { task_id: 4, nisn: "006", kelas_code: "9b", score: null, status: "KUMPUL" },

    // Task 5 (9A: 3 siswa): tidak ada nilai
    // Task 6 (9B: 2 siswa): 006 DINILAI (score 90), 007 KUMPUL -> semua kumpul
    { task_id: 6, nisn: "006", kelas_code: "9b", score: 90, status: "DINILAI" },
    { task_id: 6, nisn: "007", kelas_code: "9b", score: null, status: "KUMPUL" },
  ]

  const mockTaskClient = {
    from(table: string) {
      return {
        select() {
          return {
            in(col: string, vals: string[]) {
              if (table === "students") {
                const filtered = mockStudents.filter((s) => vals.includes(s.kelas_code.toLowerCase()))
                return Promise.resolve({ data: filtered, error: null })
              }
              if (table === "tasks") {
                const filtered = mockTasks.filter((t) => vals.includes(t.kelas_code.toLowerCase()))
                return Promise.resolve({ data: filtered, error: null })
              }
              if (table === "grades") {
                const filtered = mockGrades.filter((g) => vals.includes(g.kelas_code.toLowerCase()))
                return Promise.resolve({ data: filtered, error: null })
              }
              return Promise.resolve({ data: [], error: null })
            },
          }
        },
      }
    },
  } as any

  const taskSummary = await dashboardService.getPendingTasksSummary(
    ["8i", "8h", "9a", "9b"],
    today,
    mockTaskClient
  )

  assert.equal(taskSummary.totalTasks, 6)
  assert.equal(taskSummary.status, "HAS_PENDING")
  // Task 6 tidak boleh masuk karena semua siswa sudah mengumpulkan
  assert.ok(!taskSummary.pendingTasks.some((t) => t.id === 6), "Task 6 yang selesai tidak boleh muncul")

  // Maksimal 3 tugas
  assert.equal(taskSummary.pendingTasks.length, 3, "Harus dibatasi maksimal 3 tugas")

  // Urutan:
  // 1. Task 3 (2026-09-18, lewat tenggat paling awal)
  // 2. Task 1 (2026-09-20, lewat tenggat berikutnya)
  // 3. Task 4 (2026-09-23, tenggat terdekat mendatang)
  assert.equal(taskSummary.pendingTasks[0].id, 3, "Tugas lewat tenggat paling awal harus di urutan 1")
  assert.equal(taskSummary.pendingTasks[0].isOverdue, true)

  assert.equal(taskSummary.pendingTasks[1].id, 1, "Tugas lewat tenggat ke-2 harus di urutan 2")
  assert.equal(taskSummary.pendingTasks[1].isOverdue, true)
  assert.equal(taskSummary.pendingTasks[1].unsubmittedCount, 1, "Siswa dengan nilai 0 tidak dihitung belum kumpul")

  assert.equal(taskSummary.pendingTasks[2].id, 4, "Tugas tenggat terdekat mendatang harus di urutan 3")
  assert.equal(taskSummary.pendingTasks[2].isOverdue, false)
  assert.equal(taskSummary.pendingTasks[2].isUpcoming, true)

  console.log("✓ Uji pengurutan tugas (lewat tenggat lalu terdekat) dan aturan nilai 0 berhasil.")

  // --- TEST 4: Penanganan Error ---
  const mockErrorClient = {
    from() {
      return {
        select() {
          return {
            in() {
              return Promise.resolve({ data: null, error: new Error("Koneksi gagal") })
            },
            eq() {
              return {
                in() {
                  return Promise.resolve({ data: null, error: new Error("Koneksi gagal") })
                },
              }
            },
          }
        },
      }
    },
  } as any

  await assert.rejects(
    dashboardService.getClassesAttendanceSummary(["9a"], today, mockErrorClient),
    /Koneksi gagal/,
    "Error jaringan harus di-throw agar komponen dapat menampilkan tombol coba lagi"
  )

  console.log("✓ Seluruh pengujian banner summary lulus dengan sempurna!")
}

runTests().catch((err) => {
  console.error("Test gagal:", err)
  process.exit(1)
})
