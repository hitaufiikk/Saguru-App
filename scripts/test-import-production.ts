import { parseSpreadsheetData } from "../src/lib/import-utils"
import * as XLSX from "xlsx"
import * as fs from "fs"
import * as path from "path"

async function runProductionParserTests() {
  console.log("=======================================================")
  console.log("🧪 PENGUJIAN PRODUKSI TERARAH: PEMETAAN IDENTITAS & VALIDASI IMPOR")
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
  // KASUS 1: BERKAS HANYA MEMILIKI NIS (NO INDUK LOKAL)
  // -------------------------------------------------------------
  console.log("--- KASUS 1: Berkas Hanya Memiliki NIS (No Induk Lokal) ---")
  const wb1 = XLSX.utils.book_new()
  const ws1 = XLSX.utils.aoa_to_sheet([
    ["DAFTAR KELAS 7"],
    [],
    ["NO", "NO INDUK", "NAMA SISWA", "L/P"],
    [1, "12867", "Abi Lintang Permana", "L"],
    [2, "12868", "Adelia Oktaviana", "P"],
  ])
  XLSX.utils.book_append_sheet(wb1, ws1, "Sheet1")
  const buf1 = XLSX.write(wb1, { type: "buffer", bookType: "xlsx" })
  const res1 = parseSpreadsheetData(buf1)

  assert(
    res1.totalRows === 2 &&
      res1.rowsData[0].nisn === "12867" &&
      res1.rowsData[0].nis === "12867" &&
      res1.rowsData[0].identityType === "NIS" &&
      res1.rowsData[1].identityType === "NIS",
    "File hanya NIS: Berhasil dipetakan ke field nisn (kontrak DB) dengan identityType = 'NIS' dan nis lokal tersimpan",
    {
      siswa1: res1.rowsData[0],
      siswa2: res1.rowsData[1],
    }
  )

  // -------------------------------------------------------------
  // KASUS 2: BERKAS HANYA MEMILIKI NISN (KEMDIKBUD 10 DIGIT)
  // -------------------------------------------------------------
  console.log("\n--- KASUS 2: Berkas Hanya Memiliki NISN ---")
  const wb2 = XLSX.utils.book_new()
  const ws2 = XLSX.utils.aoa_to_sheet([
    ["DATA SISWA KEMDIKBUD"],
    [],
    ["NO", "NISN", "NAMA SISWA", "L/P"],
    [1, "0089123001", "Budi Santoso", "L"],
    [2, "0089123002", "Cantika Putri", "P"],
  ])
  XLSX.utils.book_append_sheet(wb2, ws2, "Sheet1")
  const buf2 = XLSX.write(wb2, { type: "buffer", bookType: "xlsx" })
  const res2 = parseSpreadsheetData(buf2)

  assert(
    res2.totalRows === 2 &&
      res2.rowsData[0].nisn === "0089123001" &&
      res2.rowsData[0].nis === undefined &&
      res2.rowsData[0].identityType === "NISN",
    "File hanya NISN: Berhasil dipetakan ke nisn dengan identityType = 'NISN'",
    res2.rowsData[0]
  )

  // -------------------------------------------------------------
  // KASUS 3: BERKAS MEMILIKI NIS DAN NISN SEKALIGUS (TIDAK TERTUKAR)
  // -------------------------------------------------------------
  console.log("\n--- KASUS 3: Berkas Memiliki NIS dan NISN Sekaligus ---")
  // 3a. Urutan: NO INDUK duluan, baru NISN
  const wb3a = XLSX.utils.book_new()
  const ws3a = XLSX.utils.aoa_to_sheet([
    ["NO", "NO INDUK", "NISN", "NAMA SISWA", "L/P"],
    [1, "12867", "0089123001", "Citra Dewi", "P"],
  ])
  XLSX.utils.book_append_sheet(wb3a, ws3a, "Sheet1")
  const buf3a = XLSX.write(wb3a, { type: "buffer", bookType: "xlsx" })
  const res3a = parseSpreadsheetData(buf3a)

  assert(
    res3a.totalRows === 1 &&
      res3a.rowsData[0].nisn === "0089123001" &&
      res3a.rowsData[0].nis === "12867" &&
      res3a.rowsData[0].identityType === "NISN",
    "Urutan NO INDUK lalu NISN: NISN asli tetap menjadi identitas utama dan NIS disimpan terpisah (tidak tertukar)",
    res3a.rowsData[0]
  )

  // 3b. Urutan: NISN duluan, baru NO INDUK
  const wb3b = XLSX.utils.book_new()
  const ws3b = XLSX.utils.aoa_to_sheet([
    ["NO", "NISN", "NO INDUK", "NAMA SISWA", "L/P"],
    [1, "0089123001", "12867", "Citra Dewi", "P"],
  ])
  XLSX.utils.book_append_sheet(wb3b, ws3b, "Sheet1")
  const buf3b = XLSX.write(wb3b, { type: "buffer", bookType: "xlsx" })
  const res3b = parseSpreadsheetData(buf3b)

  assert(
    res3b.totalRows === 1 &&
      res3b.rowsData[0].nisn === "0089123001" &&
      res3b.rowsData[0].nis === "12867" &&
      res3b.rowsData[0].identityType === "NISN",
    "Urutan NISN lalu NO INDUK: Hasil konsisten dan tidak tertukar",
    res3b.rowsData[0]
  )

  // -------------------------------------------------------------
  // KASUS 4: HEADER 'NO INDUK' AMBIGU (STACKED/BERTINGKAT/INDUK SAJA)
  // -------------------------------------------------------------
  console.log("\n--- KASUS 4: Header Ambigu & Bertingkat ---")
  const wb4 = XLSX.utils.book_new()
  const ws4 = XLSX.utils.aoa_to_sheet([
    ["DAFTAR NAMA SISWA"],
    ["MATA PELAJARAN: MATEMATIKA"],
    [],
    ["NO", "NO", "NAMA", "L/P"],
    ["ABS", "INDUK"], // Stacked multi-row header seperti di FORMAT EXCEL & PDF.xlsx
    [1, 12867, "Deni Kurniawan", "L"],
    [2, 12868, "Erna Wati", "P"],
  ])
  XLSX.utils.book_append_sheet(wb4, ws4, "Sheet1")
  const buf4 = XLSX.write(wb4, { type: "buffer", bookType: "xlsx" })
  const res4 = parseSpreadsheetData(buf4)

  assert(
    res4.totalRows === 2 &&
      res4.rowsData[0].nisn === "12867" &&
      res4.rowsData[0].identityType === "NIS" &&
      res4.rowsData[0].nama === "Deni Kurniawan",
    "Header bertingkat 'NO' + 'INDUK' berhasil terdeteksi sebagai nomor induk lokal",
    res4.rowsData[0]
  )

  // -------------------------------------------------------------
  // KASUS 5: PRESERVASI IDENTITAS TEKS DENGAN NOL DI DEPAN
  // -------------------------------------------------------------
  console.log("\n--- KASUS 5: Preservasi Teks dengan Nol di Depan ---")
  // 5a. CSV dengan leading zeros pada NISN dan NIS
  const csvLeadingZero =
    "NO,NISN,NAMA SISWA,L/P\r\n" +
    '1,"0089123001","Fajar Hidayat","L"\r\n' +
    '2,"0001234567","Gita Gutawa","P"\r\n'

  const res5a = parseSpreadsheetData(csvLeadingZero)
  assert(
    res5a.totalRows === 2 &&
      res5a.rowsData[0].nisn === "0089123001" &&
      res5a.rowsData[1].nisn === "0001234567",
    "CSV: Leading zeros '0089123001' dan '0001234567' dipertahankan utuh sebagai teks tanpa konversi numeric",
    {
      s1: res5a.rowsData[0].nisn,
      s2: res5a.rowsData[1].nisn,
    }
  )

  // 5b. Excel text cell dengan leading zeros pada NIS lokal
  const wb5b = XLSX.utils.book_new()
  const ws5b = XLSX.utils.aoa_to_sheet([
    ["NO", "NO INDUK", "NAMA", "L/P"],
    [1, "00128", "Hadi Pranoto", "L"],
    [2, "0567", "Intan Permata", "P"],
  ])
  XLSX.utils.book_append_sheet(wb5b, ws5b, "Sheet1")
  const buf5b = XLSX.write(wb5b, { type: "buffer", bookType: "xlsx" })
  const res5b = parseSpreadsheetData(buf5b)

  assert(
    res5b.totalRows === 2 &&
      res5b.rowsData[0].nisn === "00128" &&
      res5b.rowsData[1].nisn === "0567",
    "Excel: NIS lokal dengan leading zero '00128' dan '0567' tidak dipotong dan tidak ditambah angka buatan",
    {
      nis1: res5b.rowsData[0].nisn,
      nis2: res5b.rowsData[1].nisn,
    }
  )

  // 5c. Siswa tanpa identitas: JANGAN buat nomor tiruan palsu
  const wb5c = XLSX.utils.book_new()
  const ws5c = XLSX.utils.aoa_to_sheet([
    ["NO", "NISN", "NAMA", "L/P"],
    [1, "", "Joko Susilo", "L"],
    [2, "-", "Kartika Sari", "P"],
  ])
  XLSX.utils.book_append_sheet(wb5c, ws5c, "Sheet1")
  const buf5c = XLSX.write(wb5c, { type: "buffer", bookType: "xlsx" })
  const res5c = parseSpreadsheetData(buf5c)

  assert(
    res5c.totalRows === 2 &&
      res5c.rowsData[0].nisn === "" &&
      res5c.rowsData[0].identityType === "TIDAK_ADA" &&
      res5c.rowsData[1].nisn === "" &&
      res5c.rowsData[1].identityType === "TIDAK_ADA",
    "Siswa tanpa identitas: Tidak membuat nomor pengganti palsu (tetap string kosong, identityType = 'TIDAK_ADA')",
    {
      s1: res5c.rowsData[0],
      s2: res5c.rowsData[1],
    }
  )

  // -------------------------------------------------------------
  // KASUS 6: BARIS TANPA NAMA & FORMULA TANPA HASIL TERSIMPAN
  // -------------------------------------------------------------
  console.log("\n--- KASUS 6: Baris Tanpa Nama & Formula Tanpa Hasil Tersimpan ---")
  const wb6 = XLSX.utils.book_new()
  const ws6 = XLSX.utils.aoa_to_sheet([
    ["NO", "NO INDUK", "NAMA SISWA", "L/P"],
    [1, "12870", "Lukman Hakim", "L"], // Valid
    [2, "12871", "", "P"], // Baris tanpa nama (hanya no & NIS)
    [3, "12872", { t: "s", f: 'CONCATENATE("Maya ", "Sofa")' }, "P"], // Formula tanpa hasil tersimpan (tanpa v)
    [4, "12873", { t: "s", f: 'CONCATENATE("Nanda ", "Putra")', v: "Nanda Putra" }, "L"], // Formula dengan hasil tersimpan
    [5, "12874", "A", "L"], // Nama terlalu pendek (< 2 huruf)
  ])
  XLSX.utils.book_append_sheet(wb6, ws6, "Sheet1")
  const buf6 = XLSX.write(wb6, { type: "buffer", bookType: "xlsx" })
  const res6 = parseSpreadsheetData(buf6)

  assert(
    res6.totalRows === 2 &&
      res6.rowsData[0].nama === "Lukman Hakim" &&
      res6.rowsData[1].nama === "Nanda Putra" &&
      res6.totalSkipped === 3 &&
      res6.skippedRows.length === 3,
    "Baris tanpa nama / formula tanpa hasil tersimpan tidak diimpor dan dicatat ke skippedRows dengan alasan jelas",
    {
      totalImported: res6.totalRows,
      skippedCount: res6.totalSkipped,
      skippedDetails: res6.skippedRows,
    }
  )

  // -------------------------------------------------------------
  // KASUS 7: VERIFIKASI FORMAT LAMA .XLS (BIFF8) & TEMPLATE RESMI
  // -------------------------------------------------------------
  console.log("\n--- KASUS 7: Format Biner .XLS & Template Asli SAGURU ---")
  // 7a. Format biner .XLS BIFF8
  const wsXls = XLSX.utils.aoa_to_sheet([
    ["NO", "NO INDUK", "NAMA", "L/P"],
    [1, "12880", "Oki Setiana", "P"],
    [2, "12881", "Pandu Wijaya", "L"],
  ])
  const wbXls = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wbXls, wsXls, "Sheet1")
  const xlsBuf = XLSX.write(wbXls, { type: "buffer", bookType: "biff8" })
  const resXls = parseSpreadsheetData(xlsBuf)

  assert(
    resXls.totalRows === 2 &&
      resXls.rowsData[0].nisn === "12880" &&
      resXls.rowsData[0].identityType === "NIS",
    "Berkas biner .XLS (Excel 97-2003 BIFF8) didukung dan dipetakan dengan tepat",
    resXls.rowsData[0]
  )

  // 7b. Template resmi FILE DATA/FORMAT EXCEL & PDF.xlsx
  const templatePath = path.join(process.cwd(), "FILE DATA/FORMAT EXCEL & PDF.xlsx")
  if (fs.existsSync(templatePath)) {
    const templateBuf = fs.readFileSync(templatePath)
    const resTemplate = parseSpreadsheetData(templateBuf)

    assert(
      resTemplate.totalRows === 316 &&
        resTemplate.rowsData[0].nama === "ABI LINTANG PERMANA" &&
        resTemplate.rowsData[0].nisn === "12867" &&
        resTemplate.rowsData[0].identityType === "NIS",
      `Template resmi SAGURU (KELAS 7): Seluruh 316 siswa teridentifikasi dengan identityType 'NIS' dan NIS awal '12867'`,
      {
        totalRows: resTemplate.totalRows,
        firstStudent: resTemplate.rowsData[0],
        lastStudent: resTemplate.rowsData[resTemplate.rowsData.length - 1],
      }
    )
  }

  console.log("\n=======================================================")
  console.log(`HASIL AKHIR PENGUJIAN: ${passed} LULUS, ${failed} GAGAL`)
  console.log("=======================================================")

  if (failed > 0) process.exit(1)
}

runProductionParserTests().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
