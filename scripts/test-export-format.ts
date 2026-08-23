import fs from "fs"
import path from "path"
import { generateExcelWorkbook, generatePDFDoc } from "../src/lib/export-utils"

const dummyStudents = [
  { noAbs: 1, nisn: "0081234561", nama: "Ahmad Fauzi", gender: "Laki-laki", status: "HADIR" },
  { noAbs: 2, nisn: "0081234562", nama: "Aisha Rahma", gender: "Perempuan", status: "DISPEN", alasanDispen: "Lomba Paskibra" },
  { noAbs: 3, nisn: "0081234563", nama: "Budi Santoso", gender: "Laki-laki", status: "SAKIT" },
  { noAbs: 4, nisn: "0081234564", nama: "Cantika Putri", gender: "Perempuan", status: "ALPHA" },
  { noAbs: 5, nisn: "0081234565", nama: "Dewa Pratama", gender: "Laki-laki", status: "HADIR" },
  { noAbs: 6, nisn: "0081234566", nama: "Eka Nurhaliza", gender: "Perempuan", status: "DISPEN", alasanDispen: "Tugas PMR" },
  { noAbs: 7, nisn: "0081234567", nama: "Fajar Ramadan", gender: "Laki-laki", status: "HADIR" },
  { noAbs: 8, nisn: "0081234568", nama: "Gita Savitri", gender: "Perempuan", status: "HADIR" },
  { noAbs: 9, nisn: "0081234569", nama: "Hendra Wijaya", gender: "Laki-laki", status: "HADIR" },
  { noAbs: 10, nisn: "0081234570", nama: "Indah Permata", gender: "Perempuan", status: "HADIR" },
]

async function runTest() {
  console.log("🚀 Starting presensi export test...")

  const exportOptions = {
    students: dummyStudents,
    kelas: "Kelas 9A",
    tahun: "2025/2026",
    waliKelas: "Devy, S.Pd.",
    tanggal: "13 Agustus 2026",
  }

  // 1. Generate Excel
  const workbook = await generateExcelWorkbook(exportOptions)
  const excelPath = path.join(process.cwd(), "test_output.xlsx")
  await workbook.xlsx.writeFile(excelPath)
  console.log(`✅ Excel file generated: ${excelPath} (${fs.statSync(excelPath).size} bytes)`)

  // 2. Generate PDF
  const pdfDoc = generatePDFDoc(exportOptions)
  const pdfPath = path.join(process.cwd(), "test_output.pdf")
  const pdfArrayBuffer = pdfDoc.output("arraybuffer")
  fs.writeFileSync(pdfPath, Buffer.from(pdfArrayBuffer))
  console.log(`✅ PDF file generated: ${pdfPath} (${fs.statSync(pdfPath).size} bytes)`)

  console.log("🎉 Export generation completed successfully!")
}

runTest().catch((err) => {
  console.error("❌ Test failed with error:", err)
  process.exit(1)
})
