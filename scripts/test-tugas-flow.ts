import assert from "node:assert/strict"

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-anon-key"

// Mock Supabase Factory
function createMockSupabase(initialTasks: Array<{ id: number; title: string; mapel: string; kelas_code: string; deadline: string }>) {
  let tasks = [...initialTasks]
  let grades: Array<{ task_id: number; nisn: string; kelas_code: string; score: number | null; status: string; mapel: string; catatan: string }> = [
    { task_id: 1, nisn: "1001", kelas_code: "9a", score: 90, status: "DINILAI", mapel: "Matematika", catatan: "Bagus" },
    { task_id: 1, nisn: "1002", kelas_code: "9a", score: null, status: "BELUM", mapel: "Matematika", catatan: "" },
  ]

  const mockClient = {
    from(table: string) {
      if (table === "tasks") {
        return {
          select() {
            return {
              eq(col: string, val: any) {
                return {
                  order() {
                    const filtered = tasks.filter((t) => (t as any)[col] === val)
                    return Promise.resolve({ data: filtered, error: null })
                  },
                }
              },
            }
          },
          insert(rows: any[]) {
            const row = rows[0]
            const newId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1
            const inserted = { id: newId, ...row }
            tasks.push(inserted)
            return {
              select() {
                return {
                  single() {
                    return Promise.resolve({ data: inserted, error: null })
                  },
                }
              },
            }
          },
          update(updates: any) {
            return {
              eq(col1: string, val1: any) {
                return {
                  eq(col2: string, val2: any) {
                    tasks = tasks.map((t) => {
                      if ((t as any)[col1] === val1 && (t as any)[col2] === val2) {
                        return { ...t, ...updates }
                      }
                      return t
                    })
                    return Promise.resolve({ error: null })
                  },
                }
              },
            }
          },
          delete() {
            return {
              eq(col1: string, val1: any) {
                return {
                  eq(col2: string, val2: any) {
                    tasks = tasks.filter((t) => !((t as any)[col1] === val1 && (t as any)[col2] === val2))
                    return Promise.resolve({ error: null })
                  },
                }
              },
            }
          },
        }
      }

      if (table === "grades") {
        return {
          delete() {
            return {
              eq(col1: string, val1: any) {
                return {
                  eq(col2: string, val2: any) {
                    grades = grades.filter((g) => !((g as any)[col1] === val1 && (g as any)[col2] === val2))
                    return Promise.resolve({ error: null })
                  },
                }
              },
            }
          },
          select() {
            return {
              eq() {
                return Promise.resolve({ data: grades, error: null })
              },
            }
          },
        }
      }

      throw new Error(`Unhandled table: ${table}`)
    },
    _getTasks: () => tasks,
    _getGrades: () => grades,
  }

  return mockClient as any
}

async function runTests() {
  const { parseTaskTitle, formatTaskTitle, tugasService } = await import("../src/lib/services/tugasService")
  const { generateTugasExcelWorkbook, generateTugasPDFDoc } = await import("../src/lib/export-utils")

  console.log("=======================================================")
  console.log("🧪 PENGUJIAN OTOMATIS: TAGIHAN TUGAS FLEKSIBEL & KATALOG")
  console.log("=======================================================\n")

  // PENGUJIAN 1: Parsing dan Formatting Judul/Label Tugas
  console.log("--- PENGUJIAN 1: Parsing dan Format Label Tugas Fleksibel ---")
  const p1 = parseTaskTitle("[UH 1] Operasi Bentuk Aljabar", 1)
  assert.equal(p1.label, "UH 1", "Label harus UH 1")
  assert.equal(p1.topic, "Operasi Bentuk Aljabar", "Topik harus Operasi Bentuk Aljabar")

  const p2 = parseTaskTitle("PR 2 : Sistem Persamaan Linier", 2)
  assert.equal(p2.label, "PR 2", "Label harus PR 2")
  assert.equal(p2.topic, "Sistem Persamaan Linier", "Topik harus Sistem Persamaan Linier")

  const p3 = parseTaskTitle("Proyek Sains", 3)
  assert.equal(p3.label, "Proyek Sains", "Label harus Proyek Sains")

  const p4 = parseTaskTitle("Latihan Soal Pythagoras", 4)
  assert.equal(p4.label, "Tugas 4", "Fallback label harus Tugas 4")
  assert.equal(p4.topic, "Latihan Soal Pythagoras", "Topik harus Latihan Soal Pythagoras")

  const formatted = formatTaskTitle("UH 1", "Operasi Bentuk Aljabar")
  assert.equal(formatted, "[UH 1] Operasi Bentuk Aljabar", "Format judul tersimpan terstruktur")

  const formattedSame = formatTaskTitle("Tugas 1", "Tugas 1")
  assert.equal(formattedSame, "[Tugas 1]", "Format label tunggal jika topik sama")
  console.log("✅ parseTaskTitle & formatTaskTitle bekerja akurat untuk seluruh format label\n")

  // PENGUJIAN 2: Service addTask, updateTask, deleteTask pada mock Supabase
  console.log("--- PENGUJIAN 2: CRUD Tugas dengan Label Fleksibel ---")
  const mockClient = createMockSupabase([
    { id: 1, title: "[Tugas 1] Latihan Pecahan", mapel: "Matematika", kelas_code: "9a", deadline: "2026-09-25" },
  ])

  // Get tasks
  const initialTasks = await tugasService.getTasksByClass("9a", mockClient)
  assert.equal(initialTasks.length, 1)
  assert.equal(initialTasks[0].label, "Tugas 1")
  assert.equal(initialTasks[0].topic, "Latihan Pecahan")

  // Add task dengan label kustom
  const added = await tugasService.addTask(
    formatTaskTitle("UH 1", "Trigonometri Dasar"),
    "Matematika",
    "9a",
    "2026-09-30",
    mockClient
  )
  assert.ok(added, "Tugas berhasil ditambahkan")
  assert.equal(added.id, 2)
  assert.equal(added.label, "UH 1")
  assert.equal(added.topic, "Trigonometri Dasar")

  // Update task
  const updatedOk = await tugasService.updateTask(
    2,
    "9a",
    { title: formatTaskTitle("UH 1 (Revisi)", "Trigonometri Lanjutan"), deadline: "2026-10-05" },
    mockClient
  )
  assert.equal(updatedOk, true, "Update tugas berhasil")

  const tasksAfterUpdate = await tugasService.getTasksByClass("9a", mockClient)
  const task2 = tasksAfterUpdate.find((t) => t.id === 2)
  assert.ok(task2)
  assert.equal(task2.label, "UH 1 (Revisi)")
  assert.equal(task2.topic, "Trigonometri Lanjutan")
  assert.equal(task2.deadline, "2026-10-05")
  console.log("✅ CRUD tugas di tugasService berhasil dan tersinkronisasi\n")

  // PENGUJIAN 3: Hapus Tugas ketika tidak ada data siswa terdaftar
  console.log("--- PENGUJIAN 3: Hapus Tugas Tanpa Siswa Terdaftar ---")
  const mockClientEmptyStudent = createMockSupabase([
    { id: 10, title: "[Tugas 1] Tagihan Nyasar", mapel: "IPA", kelas_code: "8i", deadline: "" },
    { id: 11, title: "[Tugas 2] Tagihan Uji Coba", mapel: "IPA", kelas_code: "8i", deadline: "" },
  ])

  const deleted10 = await tugasService.deleteTask(10, "8i", mockClientEmptyStudent)
  assert.equal(deleted10, true, "Penghapusan tugas 10 berhasil")
  const remainingTasks = await tugasService.getTasksByClass("8i", mockClientEmptyStudent)
  assert.equal(remainingTasks.length, 1, "Sisa 1 tugas setelah dihapus")
  assert.equal(remainingTasks[0].id, 11, "Tugas 11 tetap ada")
  console.log("✅ Fitur hapus tugas berhasil dieksekusi tanpa memerlukan data siswa\n")

  // PENGUJIAN 4: Integrasi Ekspor Excel dan PDF dengan Label Fleksibel
  console.log("--- PENGUJIAN 4: Ekspor Dokumen dengan Header Label Fleksibel ---")
  const exportStudents = [
    {
      noAbs: 1,
      nisn: "1001",
      nama: "Ahmad Dahlan",
      gender: "Laki-laki",
      scores: {
        1: { score: 95, status: "DINILAI" as const },
        2: { score: 88, status: "DINILAI" as const },
      },
      average: 91.5,
      isPassed: true,
    },
  ]

  const customHeaders = ["UH 1", "PR 2"]
  const taskIds = [1, 2]

  const workbook = await generateTugasExcelWorkbook({
    students: exportStudents,
    mapel: "Matematika",
    kelas: "Kelas 9A",
    tahun: "2025/2026",
    waliKelas: "Devy, S.Pd.",
    totalTasks: 2,
    taskHeaders: customHeaders,
    taskIds: taskIds,
  })

  const sheet = workbook.getWorksheet("Nilai Tugas")
  assert.ok(sheet, "Worksheet Nilai Tugas harus dibuat")
  const headerRow = sheet.getRow(6)
  assert.equal(headerRow.getCell(5).value, "UH 1", "Header kolom 5 Excel harus 'UH 1'")
  assert.equal(headerRow.getCell(6).value, "PR 2", "Header kolom 6 Excel harus 'PR 2'")

  const pdfDoc = generateTugasPDFDoc({
    students: exportStudents,
    mapel: "Matematika",
    kelas: "Kelas 9A",
    tahun: "2025/2026",
    waliKelas: "Devy, S.Pd.",
    totalTasks: 2,
    taskHeaders: customHeaders,
    taskIds: taskIds,
  })
  assert.ok(pdfDoc, "PDF doc harus berhasil dibuat")
  assert.equal(pdfDoc.getNumberOfPages(), 1, "PDF 1 halaman landscape")
  console.log("✅ Ekspor Excel dan PDF berhasil menampilkan label tugas fleksibel ('UH 1', 'PR 2')\n")

  console.log("=======================================================")
  console.log("HASIL: SELURUH 4 PENGUJIAN TAGIHAN TUGAS LULUS 100%!")
  console.log("=======================================================")
}

runTests().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
