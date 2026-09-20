import assert from "node:assert/strict"

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-anon-key"

type PresensiRow = {
  nisn: string
  tanggal_presensi: string
  status: string
  alasan_dispen?: string
}

function createMockSupabase(rows: PresensiRow[]) {
  const calls: { gte?: string; lte?: string; kelasCode?: string } = {}

  const queryBuilder = {
    select(columns: string) {
      assert.ok(columns.includes("nisn") && columns.includes("tanggal_presensi"), "Query must select essential columns")
      return queryBuilder
    },
    eq(field: string, value: string) {
      if (field === "kelas_code") calls.kelasCode = value
      return queryBuilder
    },
    gte(field: string, value: string) {
      if (field === "tanggal_presensi") calls.gte = value
      return queryBuilder
    },
    lte(field: string, value: string) {
      if (field === "tanggal_presensi") calls.lte = value
      return Promise.resolve({
        data: rows,
        error: null,
      })
    },
  }

  const client = {
    from(table: string) {
      assert.equal(table, "presensi", "Expected query to presensi table")
      return queryBuilder
    },
  }

  return { client, calls }
}

async function runTests() {
  const { presensiService } = await import("@/lib/services/presensiService")
  const {
    buildStudentMonthlyAttendance,
    generateMonthlyPresensiPDFDoc,
    generateMonthlyPresensiExcelWorkbook,
  } = await import("@/lib/export-utils")

  console.log("=======================================================")
  console.log("🧪 PENGUJIAN OTOMATIS: PRESENSI BULANAN & EKSPOR LANDSCAPE")
  console.log("=======================================================")

  // 1. Uji getMonthlyPresensiByClass dengan Mock Supabase
  console.log("\n--- PENGUJIAN 1: Pengambilan Presensi Bulanan dari Supabase ---")
  const mockRows: PresensiRow[] = [
    { nisn: "0081234501", tanggal_presensi: "2026-08-01", status: "HADIR" },
    { nisn: "0081234501", tanggal_presensi: "2026-08-02", status: "SAKIT" },
    { nisn: "0081234501", tanggal_presensi: "2026-08-03", status: "DISPEN", alasan_dispen: "Lomba Matematika" },
    { nisn: "0081234502", tanggal_presensi: "2026-08-01", status: "ALPHA" },
    { nisn: "0081234502", tanggal_presensi: "2026-08-02", status: "" }, // data status kosong/belum dicatat
  ]

  const { client, calls } = createMockSupabase(mockRows)
  const monthlyData = await presensiService.getMonthlyPresensiByClass("9a", 2026, 8, client as unknown as Parameters<typeof presensiService.getMonthlyPresensiByClass>[3])

  assert.equal(calls.kelasCode, "9a", "Kelas code harus 9a")
  assert.equal(calls.gte, "2026-08-01", "Tanggal awal harus 2026-08-01")
  assert.equal(calls.lte, "2026-08-31", "Tanggal akhir harus 2026-08-31 untuk Agustus")

  assert.equal(monthlyData["0081234501"][1].status, "HADIR")
  assert.equal(monthlyData["0081234501"][2].status, "SAKIT")
  assert.equal(monthlyData["0081234501"][3].status, "DISPEN")
  assert.equal(monthlyData["0081234501"][3].alasanDispen, "Lomba Matematika")
  assert.equal(monthlyData["0081234502"][1].status, "ALPHA")
  assert.equal(monthlyData["0081234502"][2].status, "BELUM_DICATAT", "Status kosong harus diperlakukan sebagai BELUM_DICATAT")

  console.log("✅ getMonthlyPresensiByClass mengambil data dengan rentang tanggal dan pemetaan status yang benar")

  // 2. Uji buildStudentMonthlyAttendance (Data belum dicatat tetap "–")
  console.log("\n--- PENGUJIAN 2: Transformasi Data Bulanan & Simbol Belum Dicatat '–' ---")
  const testStudents = [
    { noAbs: 1, nisn: "0081234501", nama: "AHMAD FAUZI", gender: "Laki-laki" },
    { noAbs: 2, nisn: "0081234502", nama: "CANTIKA PUTRI", gender: "Perempuan" },
  ]

  const monthlyAttendance = buildStudentMonthlyAttendance(testStudents, monthlyData, 31)
  assert.equal(monthlyAttendance.length, 2)

  // Siswa 1
  const s1 = monthlyAttendance[0]
  assert.equal(s1.dailyStatus[1], "H")
  assert.equal(s1.dailyStatus[2], "S")
  assert.equal(s1.dailyStatus[3], "D")
  assert.equal(s1.dailyStatus[4], "–", "Tanggal 4 yang belum dicatat harus bernilai '–'")
  assert.equal(s1.dailyStatus[31], "–", "Tanggal 31 yang belum dicatat harus bernilai '–'")
  assert.equal(s1.totalHadir, 1)
  assert.equal(s1.totalSakit, 1)
  assert.equal(s1.totalDispen, 1)
  assert.equal(s1.totalIzin, 0)
  assert.equal(s1.totalAlpha, 0)
  // Persentase: Hadir (1) + Dispen (1) dari total dicatat (3) = 67%
  assert.equal(s1.percentage, 67)

  // Siswa 2
  const s2 = monthlyAttendance[1]
  assert.equal(s2.dailyStatus[1], "A")
  assert.equal(s2.dailyStatus[2], "–", "Status kosong/belum dicatat harus '–'")
  assert.equal(s2.dailyStatus[5], "–", "Hari tanpa catatan harus '–'")
  assert.equal(s2.totalAlpha, 1)
  assert.equal(s2.totalHadir, 0)
  assert.equal(s2.percentage, 0)

  console.log("✅ Data belum dicatat terkonfirmasi '–' dan total dihitung secara akurat")

  // 3. Uji PDF Landscape 1 Lembar dengan 35 Siswa & Nama Panjang
  console.log("\n--- PENGUJIAN 3: Layout PDF Landscape 1 Lembar Pas & Tidak Terpotong ---")
  const fullClassStudents = Array.from({ length: 35 }, (_, idx) => {
    const names = [
      "MUHAMMAD NAZRIEL IRWANSYAH PUTRA",
      "ADELIA OKTAVIANA RAMADHANI",
      "MUHAMMAD RIZKY PRATAMA RAMADHAN",
      "ANINDYA AULIA RAHMADHANI",
      "YUWANDIRA RAMADINI APRILIO",
      "ACHMAD FARHAN AL GHIFARI",
    ]
    return {
      noAbs: idx + 1,
      nisn: `00812345${String(idx + 10).padStart(2, "0")}`,
      nama: names[idx % names.length],
      gender: idx % 2 === 0 ? "Laki-laki" : "Perempuan",
      dailyStatus: Array.from({ length: 31 }, (_, d) => d + 1).reduce((acc, d) => {
        acc[d] = d <= 15 ? (d % 6 === 0 ? "S" : "H") : "–"
        return acc
      }, {} as Record<number, string>),
      totalHadir: 13,
      totalSakit: 2,
      totalIzin: 0,
      totalAlpha: 0,
      totalDispen: 0,
      percentage: 87,
    }
  })

  const pdfDoc = generateMonthlyPresensiPDFDoc({
    students: fullClassStudents,
    kelas: "Kelas 9A",
    bulan: 8,
    tahun: 2026,
    waliKelas: "Devy, S.Pd.",
    tahunAjaran: "2025/2026",
  })

  const pdfPageCount = pdfDoc.getNumberOfPages()
  assert.equal(pdfPageCount, 1, `PDF harus tepat 1 lembar landscape, tetapi menghasilkan ${pdfPageCount} halaman`)

  const lastY = (pdfDoc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 0
  assert.ok(lastY < 200, `Tinggi akhir tabel ${lastY} mm harus di bawah batas A4 landscape 210 mm`)

  console.log(`✅ PDF 1 Lembar Landscape terverifikasi: 1 halaman, tinggi tabel selesai di Y = ${lastY.toFixed(2)} mm`)

  // 4. Uji Excel Landscape 1 Lembar & Kolom Tanggal
  console.log("\n--- PENGUJIAN 4: Format Excel Landscape & Konfigurasi Fit-to-Page ---")
  const wb = await generateMonthlyPresensiExcelWorkbook({
    students: fullClassStudents,
    kelas: "Kelas 9A",
    bulan: 8,
    tahun: 2026,
    waliKelas: "Devy, S.Pd.",
    tahunAjaran: "2025/2026",
  })

  assert.equal(wb.worksheets.length, 1, "Harus menghasilkan 1 worksheet")
  const ws = wb.worksheets[0]
  assert.equal(ws.pageSetup?.orientation, "landscape", "Orientasi Excel harus landscape")
  assert.equal(ws.pageSetup?.fitToWidth, 1, "Excel fit to 1 page width")
  assert.equal(ws.pageSetup?.fitToHeight, 1, "Excel fit to 1 page height")

  // Row 5 header tanggal 1..31
  const headerRow = ws.getRow(5)
  assert.equal(headerRow.getCell(1).value, "NO")
  assert.equal(headerRow.getCell(2).value, "NISN")
  assert.equal(headerRow.getCell(3).value, "NAMA SISWA")
  assert.equal(headerRow.getCell(4).value, "L/P")
  assert.equal(headerRow.getCell(5).value, "1", "Tanggal 1 harus kolom 5")
  assert.equal(headerRow.getCell(35).value, "31", "Tanggal 31 harus kolom 35")

  // Data row baris 6
  const dataRow1 = ws.getRow(6)
  assert.equal(dataRow1.getCell(1).value, 1)
  assert.equal(dataRow1.getCell(20).value, "–", "Hari ke-16 yang belum dicatat harus '–'")

  console.log("✅ Excel terverifikasi: orientasi landscape, fitToWidth: 1, fitToHeight: 1, tanggal 1..31 lengkap, dan data kosong '–'")

  console.log("\n=======================================================")
  console.log("HASIL: SEMUA 4 PENGUJIAN PRESENSI BULANAN LULUS 100%!")
  console.log("=======================================================")
}

runTests().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
