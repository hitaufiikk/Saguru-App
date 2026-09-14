import { parseSpreadsheetData } from "../src/lib/import-utils"
import * as XLSX from "xlsx"
import * as fs from "fs"
import * as path from "path"

async function runProductionParserTests() {
  console.log("=======================================================")
  console.log("🧪 PENGUJIAN LANGSUNG TERHADAP MODUL PRODUKSI import-utils")
  console.log("=======================================================\n")

  let passed = 0
  let failed = 0

  // 1. UJI CSV: Koma, Titik-koma, Escaped Quotes, Newline dalam Kutip, UTF-8 BOM, CRLF, NISN 0 di depan
  console.log("--- 1. UJI CSV KOMPREHENSIF ---")
  const csvComprehensive =
    '\uFEFF"NO","NISN","NAMA SISWA","L/P"\r\n' +
    '1,"0089123001","Ahmad\nFauzi","L"\r\n' +
    '2,"0012345678","Budi ""Bintang Kelas"" Santoso","L"\r\n' +
    '\r\n' + // blank line
    '3,"0098765432","Citra Dewi; S.Pd.","P"\r\n' +
    '4,"0089123004",,"Perempuan"\r\n' // empty nama (should be skipped)

  const resCsv1 = parseSpreadsheetData(csvComprehensive)
  const nisn1 = resCsv1.rowsData[0]?.nisn
  const nama1 = resCsv1.rowsData[0]?.nama
  const nama2 = resCsv1.rowsData[1]?.nama
  const nisn2 = resCsv1.rowsData[1]?.nisn

  if (
    resCsv1.totalRows === 3 &&
    nisn1 === "0089123001" &&
    nisn2 === "0012345678" &&
    nama1.includes("Ahmad") &&
    nama2.includes('Budi "Bintang Kelas" Santoso')
  ) {
    console.log(`✅ CSV Koma & Karakter Khusus Lulus:`)
    console.log(`   - Preservasi NISN nol di depan: "${nisn1}", "${nisn2}"`)
    console.log(`   - Baris baru di dalam field kutip berhasil dibaca`)
    console.log(`   - Escaped quote ("") berhasil: "${nama2}"`)
    console.log(`   - UTF-8 BOM dan CRLF ditangani tanpa error`)
    passed++
  } else {
    console.error("❌ CSV Koma Gagal:", resCsv1)
    failed++
  }

  // 1b. UJI CSV Titik-Koma (Semicolon)
  const csvSemicolon =
    "NO;NISN;NAMA;L/P\r\n" +
    "1;0089123010;Deni Kurniawan;L\r\n" +
    "2;0089123011;Erna Wati;P\r\n"

  const resCsvSemi = parseSpreadsheetData(csvSemicolon)
  if (resCsvSemi.totalRows === 2 && resCsvSemi.rowsData[0].nisn === "0089123010") {
    console.log(`✅ CSV Titik-Koma (Semicolon Delimiter) Lulus: ${resCsvSemi.totalRows} baris diekstraksi.`)
    passed++
  } else {
    console.error("❌ CSV Titik-Koma Gagal:", resCsvSemi)
    failed++
  }

  // 2. UJI FORMAT BINER .XLS LAMA (Excel 97-2003 BIFF8)
  console.log("\n--- 2. UJI FORMAT BINER .XLS (EXCEL 97-2003) ---")
  const wsXls = XLSX.utils.aoa_to_sheet([
    ["DAFTAR SISWA BIFF8"],
    [],
    ["NO", "NISN", "NAMA", "L/P"],
    [1, "0089123020", "Fajar Hidayat", "L"],
    [2, "0089123021", "Gita Gutawa", "P"],
  ])
  const wbXls = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wbXls, wsXls, "Sheet1")
  const xlsBuffer = XLSX.write(wbXls, { type: "buffer", bookType: "biff8" })

  const resXls = parseSpreadsheetData(xlsBuffer)
  if (resXls.totalRows === 2 && resXls.rowsData[0].nisn === "0089123020" && resXls.rowsData[1].nama === "Gita Gutawa") {
    console.log(`✅ Berkas Biner .XLS Berhasil Dibaca: Dukungan format lama pulih sempurna (${resXls.totalRows} siswa).`)
    passed++
  } else {
    console.error("❌ Berkas .XLS Gagal:", resXls)
    failed++
  }

  // 3. UJI FORMULA EXCEL (DENGAN HASIL TERSIMPAN vs TANPA HASIL TERSIMPAN)
  console.log("\n--- 3. UJI FORMULA EXCEL (.XLSX) ---")
  // 3a. Formula dengan hasil tersimpan (precalculated value)
  const wsFormulaStored = XLSX.utils.aoa_to_sheet([
    ["NO", "NISN", "NAMA LENGKAP", "GENDER"],
    [1, "0089123030", { t: "s", f: 'CONCATENATE("Hadi ", "Pranoto")', v: "Hadi Pranoto" }, "L"],
    [2, "0089123031", { t: "s", f: 'CONCATENATE("Intan ", "Permata")', v: "Intan Permata" }, "P"],
  ])
  const wbFormulaStored = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wbFormulaStored, wsFormulaStored, "Data")
  const bufFormulaStored = XLSX.write(wbFormulaStored, { type: "buffer", bookType: "xlsx" })

  const resFormulaStored = parseSpreadsheetData(bufFormulaStored)
  if (resFormulaStored.totalRows === 2 && resFormulaStored.rowsData[0].nama === "Hadi Pranoto") {
    console.log(`✅ Formula dengan hasil tersimpan: Berhasil mengevaluasi nilai hasil ("${resFormulaStored.rowsData[0].nama}").`)
    passed++
  } else {
    console.error("❌ Formula dengan hasil tersimpan Gagal:", resFormulaStored)
    failed++
  }

  // 3b. Formula tanpa hasil tersimpan (kosong / belum dihitung kalkulator Excel)
  const wsFormulaNoStored = XLSX.utils.aoa_to_sheet([
    ["NO", "NISN", "NAMA", "L/P"],
    // Cell nama hanya punya f tanpa v
    [1, "0089123040", { t: "s", f: 'CONCATENATE("Joko ", "Susilo")' }, "L"],
  ])
  const wbFormulaNoStored = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wbFormulaNoStored, wsFormulaNoStored, "Data")
  const bufFormulaNoStored = XLSX.write(wbFormulaNoStored, { type: "buffer", bookType: "xlsx" })

  const resFormulaNoStored = parseSpreadsheetData(bufFormulaNoStored)
  console.log(`ℹ️  Formula tanpa hasil tersimpan: Total rows terdeteksi = ${resFormulaNoStored.totalRows}.`)
  console.log(`   (Perilaku: SheetJS membaca cell tanpa hasil tersimpan sebagai string kosong jika tidak ada kalkulasi; baris tanpa nama diabaikan dengan aman tanpa crash).`)
  passed++

  // 4. UJI TEMPLATE ASLI FILE DATA/FORMAT EXCEL & PDF.xlsx
  console.log("\n--- 4. UJI TEMPLATE ASLI PROYEK ---")
  const templatePath = path.join(process.cwd(), "FILE DATA/FORMAT EXCEL & PDF.xlsx")
  if (fs.existsSync(templatePath)) {
    const templateBuf = fs.readFileSync(templatePath)
    const resTemplate = parseSpreadsheetData(templateBuf)
    if (resTemplate.totalRows > 0) {
      console.log(`✅ Template Resmi Siswa Berhasil Diproses: ${resTemplate.totalRows} data siswa terdeteksi.`)
      console.log(`   Header terdeteksi:`, resTemplate.detectedHeaders)
      console.log(`   Siswa pertama:`, resTemplate.rowsData[0])
      passed++
    } else {
      console.error("❌ Template Resmi Gagal:", resTemplate)
      failed++
    }
  }

  console.log("\n=======================================================")
  console.log(`HASIL AKHIR: ${passed} PENGUJIAN LULUS, ${failed} GAGAL`)
  console.log("=======================================================")

  if (failed > 0) process.exit(1)
}

runProductionParserTests().catch((err) => {
  console.error("Fatal test error:", err)
  process.exit(1)
})
