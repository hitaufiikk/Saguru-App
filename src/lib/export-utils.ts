import ExcelJS from "exceljs"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export interface ExportStudentData {
  noAbs: number
  nisn: string
  nama: string
  gender: string
  status?: string
  alasanDispen?: string
}

export function getFormattedCurrentDate(dateInput?: string | Date): string {
  if (dateInput && typeof dateInput === "string" && dateInput.trim() !== "" && dateInput !== "13 Agustus 2026") {
    return dateInput
  }
  const validDate = dateInput && dateInput instanceof Date ? dateInput : new Date()
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ]
  const day = validDate.getDate()
  const month = months[validDate.getMonth()]
  const year = validDate.getFullYear()
  return `${day} ${month} ${year}`
}

export function getFormattedCurrentDateTime(dateInput?: string | Date): string {
  const validDate = dateInput && dateInput instanceof Date ? dateInput : new Date()
  const dateStr = getFormattedCurrentDate(validDate)
  const hours = String(validDate.getHours()).padStart(2, "0")
  const minutes = String(validDate.getMinutes()).padStart(2, "0")
  return `${dateStr}, Pukul ${hours}:${minutes} WIB`
}

export interface ExportOptions {
  students: ExportStudentData[]
  kelas: string
  tahun: string
  waliKelas: string
  tanggal?: string
  tanggalExport?: string
}

export async function generateExcelWorkbook(options: ExportOptions): Promise<ExcelJS.Workbook> {
  const { students, kelas, tahun, waliKelas, tanggal, tanggalExport } = options
  const actualTanggal = getFormattedCurrentDate(tanggal)
  const actualExportTime = tanggalExport || getFormattedCurrentDateTime()

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Data Presensi")

  // Column definitions & widths matching template
  worksheet.columns = [
    { key: "noAbs", width: 10 },
    { key: "nisn", width: 18 },
    { key: "nama", width: 35 },
    { key: "gender", width: 8 },
    { key: "status", width: 18 },
    { key: "keterangan", width: 32 },
  ]

  // Row 1: Title
  const r1 = worksheet.addRow(["DAFTAR PRESENSI SISWA"])
  worksheet.mergeCells("A1:F1")
  r1.font = { name: "Arial", size: 12, bold: true }
  r1.alignment = { horizontal: "center", vertical: "middle" }

  // Row 2: Subtitle
  const r2 = worksheet.addRow([`TAHUN PELAJARAN ${tahun}`])
  worksheet.mergeCells("A2:F2")
  r2.font = { name: "Arial", size: 12, bold: true }
  r2.alignment = { horizontal: "center", vertical: "middle" }

  // Row 3: Blank
  worksheet.addRow([])

  // Row 4: Mata Pelajaran & Kelas
  const r4 = worksheet.addRow([
    "MATA PELAJARAN: Presensi Harian",
    "",
    "",
    "",
    "",
    `KELAS : ${kelas}`,
  ])
  r4.font = { name: "Arial", size: 11 }
  r4.getCell(6).alignment = { horizontal: "right" }

  // Row 5: Tanggal & Wali Kelas
  const r5 = worksheet.addRow([
    `TANGGAL PRESENSI : ${actualTanggal}`,
    "",
    "",
    "",
    "",
    `Wali Kelas : ${waliKelas}`,
  ])
  r5.font = { name: "Arial", size: 11 }
  r5.getCell(6).alignment = { horizontal: "right" }

  // Row 6 & 7: Header Table
  const r6 = worksheet.addRow(["NO", "NO", "NAMA", "L/P", "STATUS PRESENSI", "KETERANGAN / ALASAN"])
  const r7 = worksheet.addRow(["ABS", "NISN", "", "", "", ""])

  worksheet.mergeCells("A6:A7")
  worksheet.mergeCells("B6:B7")
  worksheet.mergeCells("C6:C7")
  worksheet.mergeCells("D6:D7")
  worksheet.mergeCells("E6:E7")
  worksheet.mergeCells("F6:F7")

  ;[r6, r7].forEach((r) => {
    r.font = { name: "Arial", size: 11, bold: true }
    r.alignment = { horizontal: "center", vertical: "middle" }
  })

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  }

  // Apply border & fill to headers
  for (let rowNum = 6; rowNum <= 7; rowNum++) {
    const row = worksheet.getRow(rowNum)
    for (let colNum = 1; colNum <= 6; colNum++) {
      const cell = row.getCell(colNum)
      cell.border = thinBorder
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2F2F2" },
      }
    }
  }

  // Add Data Rows
  students.forEach((student) => {
    const statusVal = student.status || "HADIR"
    const alasanVal = statusVal === "DISPEN" ? (student.alasanDispen || "Dispensasi") : "-"

    const row = worksheet.addRow([
      student.noAbs,
      student.nisn,
      student.nama.toUpperCase(),
      student.gender === "Laki-laki" || student.gender === "L" ? "L" : "P",
      statusVal,
      alasanVal,
    ])

    row.font = { name: "Arial", size: 10 }
    row.getCell(1).alignment = { horizontal: "center" }
    row.getCell(2).alignment = { horizontal: "center" }
    row.getCell(4).alignment = { horizontal: "center" }
    row.getCell(5).alignment = { horizontal: "center" }

    for (let colNum = 1; colNum <= 6; colNum++) {
      row.getCell(colNum).border = thinBorder
    }
  })

  // Add Summary Rows
  const countL = students.filter((s) => s.gender === "Laki-laki" || s.gender === "L").length
  const countP = students.filter((s) => s.gender === "Perempuan" || s.gender === "P").length
  const countHadir = students.filter((s) => (s.status || "HADIR") === "HADIR").length
  const countDispen = students.filter((s) => s.status === "DISPEN").length
  const countSakit = students.filter((s) => s.status === "SAKIT").length
  const countAlpha = students.filter((s) => s.status === "ALPHA").length
  const total = students.length

  // Blank row
  worksheet.addRow([])

  // Rekap Gender
  const rL = worksheet.addRow(["", "L =", countL, "", "Hadir (H) =", countHadir])
  rL.font = { name: "Arial", size: 11, bold: true }
  rL.getCell(2).alignment = { horizontal: "right" }
  rL.getCell(5).alignment = { horizontal: "right" }

  const rP = worksheet.addRow(["", "P =", countP, "", "Dispen (D) =", countDispen])
  rP.font = { name: "Arial", size: 11, bold: true }
  rP.getCell(2).alignment = { horizontal: "right" }
  rP.getCell(5).alignment = { horizontal: "right" }

  const rSakit = worksheet.addRow(["", "", "", "", "Sakit (S) =", countSakit])
  rSakit.font = { name: "Arial", size: 11, bold: true }
  rSakit.getCell(5).alignment = { horizontal: "right" }

  const rAlpha = worksheet.addRow(["", "", "", "", "Alpha (A) =", countAlpha])
  rAlpha.font = { name: "Arial", size: 11, bold: true }
  rAlpha.getCell(5).alignment = { horizontal: "right" }

  const rTotal = worksheet.addRow(["", "Jmlh =", total, "", "Total =", total])
  rTotal.font = { name: "Arial", size: 11, bold: true }
  rTotal.getCell(2).alignment = { horizontal: "right" }
  rTotal.getCell(5).alignment = { horizontal: "right" }

  // Timestamp Export footer row
  const rExport = worksheet.addRow(["", `Waktu Export: ${actualExportTime}`, "", "", "", ""])
  rExport.font = { name: "Arial", size: 9, italic: true }
  rExport.getCell(2).alignment = { horizontal: "left" }

  return workbook
}

export function generatePDFDoc(options: ExportOptions): jsPDF {
  const { students, kelas, tahun, waliKelas, tanggal, tanggalExport } = options
  const actualTanggal = getFormattedCurrentDate(tanggal)
  const actualExportTime = tanggalExport || getFormattedCurrentDateTime()

  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" })

  // Header Title
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("DAFTAR PRESENSI SISWA", 105, 15, { align: "center" })

  doc.setFontSize(12)
  doc.text(`TAHUN PELAJARAN ${tahun}`, 105, 22, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9.5)
  doc.text(`TANGGAL ABSEN: ${actualTanggal}`, 14, 31)
  doc.text(`WAKTU EXPORT  : ${actualExportTime}`, 14, 36)
  doc.text(`KELAS        : ${kelas}`, 196, 31, { align: "right" })
  doc.text(`Wali Kelas   : ${waliKelas}`, 196, 36, { align: "right" })

  // Table
  autoTable(doc, {
    startY: 42,
    head: [["NO ABS", "NISN", "NAMA SISWA", "L/P", "STATUS", "KETERANGAN / ALASAN"]],
    body: students.map((s) => [
      s.noAbs,
      s.nisn,
      s.nama.toUpperCase(),
      s.gender === "Laki-laki" || s.gender === "L" ? "L" : "P",
      s.status || "HADIR",
      s.status === "DISPEN" ? (s.alasanDispen || "Dispensasi") : "-",
    ]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      lineWidth: 0.2,
      lineColor: [100, 100, 100],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 16 },
      1: { halign: "center", cellWidth: 28 },
      2: { halign: "left" },
      3: { halign: "center", cellWidth: 14 },
      4: { halign: "center", cellWidth: 22 },
      5: { halign: "left", cellWidth: 40 },
    },
  })

  // Recap Counts (Keterangan Jumlah Siswa)
  const countL = students.filter(
    (s) => s.gender === "Laki-laki" || s.gender === "L"
  ).length
  const countP = students.filter(
    (s) => s.gender === "Perempuan" || s.gender === "P"
  ).length
  const total = students.length

  const countHadir = students.filter((s) => (s.status || "HADIR") === "HADIR").length
  const countDispen = students.filter((s) => s.status === "DISPEN").length
  const countSakit = students.filter((s) => s.status === "SAKIT").length
  const countAlpha = students.filter((s) => s.status === "ALPHA").length

  const finalY = (doc as any).lastAutoTable
    ? (doc as any).lastAutoTable.finalY + 8
    : 120

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.text("REKAPITULASI PRESENSI SISWA:", 14, finalY)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(`• Hadir (H)   : ${countHadir} siswa`, 18, finalY + 5)
  doc.text(`• Dispen (D)  : ${countDispen} siswa`, 18, finalY + 10)
  doc.text(`• Sakit (S)   : ${countSakit} siswa`, 18, finalY + 15)
  doc.text(`• Alpha (A)   : ${countAlpha} siswa`, 18, finalY + 20)

  doc.text(`• Laki-laki (L)  : ${countL} siswa`, 100, finalY + 5)
  doc.text(`• Perempuan (P) : ${countP} siswa`, 100, finalY + 10)
  doc.setFont("helvetica", "bold")
  doc.text(`• Total Siswa    : ${total} siswa`, 100, finalY + 15)

  return doc
}

export async function exportToExcel(options: ExportOptions) {
  const workbook = await generateExcelWorkbook(options)
  const filename = `Presensi_Siswa_${options.kelas.replace(/\s+/g, "_")}_${options.tahun.replace("/", "-")}.xlsx`

  if (typeof window !== "undefined") {
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export function exportToPDF(options: ExportOptions) {
  const doc = generatePDFDoc(options)
  const filename = `Presensi_Siswa_${options.kelas.replace(/\s+/g, "_")}_${options.tahun.replace("/", "-")}.pdf`

  if (typeof window !== "undefined") {
    doc.save(filename)
  }
}

export interface ExportTugasItem {
  noAbs: number
  nisn: string
  nama: string
  gender: string
  scores: Record<number, { score: number | null; status: "DINILAI" | "KUMPUL" | "BELUM" | "TERLAMBAT" }>
  average: number
  isPassed: boolean
}

export interface ExportTugasOptions {
  students: ExportTugasItem[]
  mapel: string
  kelas: string
  tahun: string
  waliKelas: string
  totalTasks: number
}

export async function generateTugasExcelWorkbook({
  students,
  mapel,
  kelas,
  tahun,
  waliKelas,
  totalTasks,
}: ExportTugasOptions): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Nilai Tugas")

  // Dynamic columns: A: noAbs, B: nisn, C: nama, D: gender, E..: T1..T(totalTasks), Next: Rata-rata, Next: Status
  const taskCols = Array.from({ length: totalTasks }, (_, i) => ({
    key: `t${i + 1}`,
    width: 8,
  }))

  worksheet.columns = [
    { key: "noAbs", width: 8 },
    { key: "nisn", width: 16 },
    { key: "nama", width: 32 },
    { key: "gender", width: 8 },
    ...taskCols,
    { key: "avg", width: 12 },
    { key: "status", width: 16 },
  ]

  const totalColCount = 6 + totalTasks

  // Row 1: Title
  const r1 = worksheet.addRow(["DAFTAR TUGAS SISWA"])
  r1.font = { name: "Arial", size: 12, bold: true }
  r1.alignment = { horizontal: "center", vertical: "middle" }

  // Row 2: Subtitle
  const r2 = worksheet.addRow([`TAHUN PELAJARAN ${tahun}`])
  r2.font = { name: "Arial", size: 12, bold: true }
  r2.alignment = { horizontal: "center", vertical: "middle" }

  worksheet.addRow([]) // blank

  const r4 = worksheet.addRow([
    `MATA PELAJARAN: ${mapel}`,
    "",
    "",
    "",
    `KELAS : ${kelas}`,
  ])
  r4.font = { name: "Arial", size: 11 }

  const r5 = worksheet.addRow([
    `TOTAL TUGAS    : ${totalTasks} Tugas`,
    "",
    "",
    "",
    `Wali Kelas : ${waliKelas}`,
  ])
  r5.font = { name: "Arial", size: 11 }

  // Headers
  const taskHeaders = Array.from({ length: totalTasks }, (_, i) => `T${i + 1}`)
  const r6 = worksheet.addRow(["NO ABS", "NISN", "NAMA SISWA", "L/P", ...taskHeaders, "RATA-RATA", "STATUS"])
  r6.font = { name: "Arial", size: 11, bold: true }
  r6.alignment = { horizontal: "center", vertical: "middle" }

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  }

  for (let colNum = 1; colNum <= totalColCount; colNum++) {
    const cell = r6.getCell(colNum)
    cell.border = thinBorder
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F3F4F6" },
    }
  }

  // Data rows
  students.forEach((s) => {
    const taskVals = Array.from({ length: totalTasks }, (_, i) => {
      const taskData = s.scores[i + 1]
      if (!taskData) return "-"
      if (taskData.status === "DINILAI" && taskData.score !== null) return taskData.score
      if (taskData.status === "KUMPUL") return "Kumpul"
      if (taskData.status === "TERLAMBAT") return "Lembat"
      return "Belum"
    })

    const r = worksheet.addRow([
      s.noAbs,
      s.nisn,
      s.nama.toUpperCase(),
      s.gender === "Laki-laki" || s.gender === "L" ? "L" : "P",
      ...taskVals,
      s.average.toFixed(1),
      s.isPassed ? "Tuntas" : "Belum Tuntas",
    ])
    r.font = { name: "Arial", size: 10 }
    r.getCell(1).alignment = { horizontal: "center" }
    r.getCell(2).alignment = { horizontal: "center" }
    r.getCell(3).alignment = { horizontal: "left" }
    r.getCell(4).alignment = { horizontal: "center" }
    for (let i = 5; i <= 4 + totalTasks; i++) {
      r.getCell(i).alignment = { horizontal: "center" }
    }
    r.getCell(5 + totalTasks).alignment = { horizontal: "center" }
    r.getCell(6 + totalTasks).alignment = { horizontal: "center" }

    for (let colNum = 1; colNum <= totalColCount; colNum++) {
      r.getCell(colNum).border = thinBorder
    }
  })

  return workbook
}

export function generateTugasPDFDoc(options: ExportTugasOptions): jsPDF {
  const { students, mapel, kelas, tahun, waliKelas, totalTasks } = options
  const doc = new jsPDF({ orientation: "l", unit: "mm", format: "a4" })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("DAFTAR TUGAS SISWA", 148, 15, { align: "center" })

  doc.setFontSize(11)
  doc.text(`TAHUN PELAJARAN ${tahun}`, 148, 22, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(`MATA PELAJARAN: ${mapel}`, 14, 32)
  doc.text(`TOTAL TUGAS    : ${totalTasks} Tugas`, 14, 37)
  doc.text(`KELAS      : ${kelas}`, 283, 32, { align: "right" })
  doc.text(`Wali Kelas : ${waliKelas}`, 283, 37, { align: "right" })

  const taskHeaders = Array.from({ length: totalTasks }, (_, i) => `T${i + 1}`)

  autoTable(doc, {
    startY: 42,
    head: [["NO ABS", "NISN", "NAMA SISWA", "L/P", ...taskHeaders, "RATA-RATA", "STATUS"]],
    body: students.map((s) => {
      const taskVals = Array.from({ length: totalTasks }, (_, i) => {
        const taskData = s.scores[i + 1]
        if (!taskData) return "-"
        if (taskData.status === "DINILAI" && taskData.score !== null) return String(taskData.score)
        if (taskData.status === "KUMPUL") return "Kumpul"
        if (taskData.status === "TERLAMBAT") return "Lembat"
        return "Belum"
      })
      return [
        s.noAbs,
        s.nisn,
        s.nama.toUpperCase(),
        s.gender === "Laki-laki" || s.gender === "L" ? "L" : "P",
        ...taskVals,
        s.average.toFixed(1),
        s.isPassed ? "TUNTAS" : "BELUM",
      ]
    }),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 1.5,
      halign: "center",
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      lineWidth: 0.2,
      lineColor: [100, 100, 100],
    },
    columnStyles: {
      2: { halign: "left" },
    },
  })

  return doc
}

export async function exportTugasToExcel(options: ExportTugasOptions) {
  const workbook = await generateTugasExcelWorkbook(options)
  const filename = `Nilai_Tugas_${options.mapel.replace(/\s+/g, "_")}_${options.kelas.replace(/\s+/g, "_")}.xlsx`

  if (typeof window !== "undefined") {
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export function exportTugasToPDF(options: ExportTugasOptions) {
  const doc = generateTugasPDFDoc(options)
  const filename = `Nilai_Tugas_${options.mapel.replace(/\s+/g, "_")}_${options.kelas.replace(/\s+/g, "_")}.pdf`

  if (typeof window !== "undefined") {
    doc.save(filename)
  }
}

export interface ExportJadwalItem {
  id: string
  day: string
  jamKe: string
  waktu: string
  kelas: string
  mapel: string
  ruangan: string
  kategori: string
}

export interface ExportJadwalOptions {
  sessions: ExportJadwalItem[]
  namaGuru: string
  kodeGuru: string
  tahun: string
}

export async function generateJadwalExcelWorkbook({
  sessions,
  namaGuru,
  kodeGuru,
  tahun,
}: ExportJadwalOptions): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Jadwal Mengajar")

  worksheet.columns = [
    { key: "day", width: 14 },
    { key: "jamKe", width: 14 },
    { key: "waktu", width: 22 },
    { key: "kelas", width: 14 },
    { key: "mapel", width: 24 },
    { key: "kategori", width: 20 },
    { key: "ruangan", width: 28 },
  ]

  // Row 1: Title
  const r1 = worksheet.addRow([`JADWAL MENGAJAR ${namaGuru.toUpperCase()}`])
  worksheet.mergeCells("A1:G1")
  r1.font = { name: "Arial", size: 12, bold: true }
  r1.alignment = { horizontal: "center", vertical: "middle" }

  // Row 2: Subtitle
  const r2 = worksheet.addRow([`KODE GURU: ${kodeGuru} | TAHUN PELAJARAN ${tahun}`])
  worksheet.mergeCells("A2:G2")
  r2.font = { name: "Arial", size: 11, bold: true }
  r2.alignment = { horizontal: "center", vertical: "middle" }

  worksheet.addRow([])

  // Headers
  const r4 = worksheet.addRow(["HARI", "JAM KE", "WAKTU", "KELAS", "MATA PELAJARAN", "KATEGORI", "LOKASI / RUANGAN"])
  r4.font = { name: "Arial", size: 11, bold: true }
  r4.alignment = { horizontal: "center", vertical: "middle" }

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  }

  for (let colNum = 1; colNum <= 7; colNum++) {
    const cell = r4.getCell(colNum)
    cell.border = thinBorder
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F3F4F6" },
    }
  }

  // Data rows
  sessions.forEach((s) => {
    const r = worksheet.addRow([
      s.day,
      s.jamKe,
      s.waktu,
      s.kelas,
      s.mapel,
      s.kategori,
      s.ruangan,
    ])
    r.font = { name: "Arial", size: 10 }
    r.getCell(1).alignment = { horizontal: "center" }
    r.getCell(2).alignment = { horizontal: "center" }
    r.getCell(3).alignment = { horizontal: "center" }
    r.getCell(4).alignment = { horizontal: "center" }
    r.getCell(5).alignment = { horizontal: "left" }
    r.getCell(6).alignment = { horizontal: "center" }
    r.getCell(7).alignment = { horizontal: "left" }

    for (let colNum = 1; colNum <= 7; colNum++) {
      r.getCell(colNum).border = thinBorder
    }
  })

  return workbook
}

export function generateJadwalPDFDoc(options: ExportJadwalOptions): jsPDF {
  const { sessions, namaGuru, kodeGuru, tahun } = options
  const doc = new jsPDF({ orientation: "l", unit: "mm", format: "a4" })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text(`JADWAL MENGAJAR ${namaGuru.toUpperCase()}`, 148, 15, { align: "center" })

  doc.setFontSize(11)
  doc.text(`KODE GURU: ${kodeGuru} | TAHUN PELAJARAN ${tahun}`, 148, 22, { align: "center" })

  autoTable(doc, {
    startY: 30,
    head: [["HARI", "JAM KE", "WAKTU", "KELAS", "MATA PELAJARAN", "KATEGORI", "LOKASI / RUANGAN"]],
    body: sessions.map((s) => [
      s.day,
      s.jamKe,
      s.waktu,
      s.kelas,
      s.mapel,
      s.kategori,
      s.ruangan,
    ]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      lineWidth: 0.2,
      lineColor: [100, 100, 100],
    },
    columnStyles: {
      0: { halign: "center" },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "left" },
      5: { halign: "center" },
      6: { halign: "left" },
    },
  })

  return doc
}

export async function exportJadwalToExcel(options: ExportJadwalOptions) {
  const workbook = await generateJadwalExcelWorkbook(options)
  const filename = `Jadwal_Mengajar_${options.namaGuru.replace(/\s+/g, "_")}.xlsx`

  if (typeof window !== "undefined") {
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export function exportJadwalToPDF(options: ExportJadwalOptions) {
  const doc = generateJadwalPDFDoc(options)
  const filename = `Jadwal_Mengajar_${options.namaGuru.replace(/\s+/g, "_")}.pdf`

  if (typeof window !== "undefined") {
    doc.save(filename)
  }
}

export interface StudentCatatanData {
  noAbs: number
  nisn: string
  nama: string
  gender: string
  catatan: string
}

export interface ExportCatatanBinaanOptions {
  students: StudentCatatanData[]
  kelas: string
  tahun?: string
  waliKelas?: string
}

export async function generateCatatanBinaanExcelWorkbook(
  options: ExportCatatanBinaanOptions
): Promise<ExcelJS.Workbook> {
  const { students, kelas, tahun = "2025/2026", waliKelas = "-" } = options
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Tagihan Catatan Siswa")

  worksheet.columns = [
    { key: "noAbs", width: 10 },
    { key: "nisn", width: 18 },
    { key: "nama", width: 35 },
    { key: "gender", width: 8 },
    { key: "catatan", width: 50 },
  ]

  // Row 1: Title
  const r1 = worksheet.addRow(["DAFTAR TAGIHAN TUGAS & CATATAN SISWA"])
  worksheet.mergeCells("A1:E1")
  r1.font = { name: "Arial", size: 12, bold: true }
  r1.alignment = { horizontal: "center", vertical: "middle" }

  // Row 2: Subtitle
  const r2 = worksheet.addRow([`TAHUN PELAJARAN ${tahun}`])
  worksheet.mergeCells("A2:E2")
  r2.font = { name: "Arial", size: 12, bold: true }
  r2.alignment = { horizontal: "center", vertical: "middle" }

  // Row 3: Blank
  worksheet.addRow([])

  // Row 4: Kelas & Wali
  const r4 = worksheet.addRow([
    `KELAS : ${kelas.toUpperCase()}`,
    "",
    "",
    "",
    `Wali Kelas : ${waliKelas}`,
  ])
  r4.font = { name: "Arial", size: 11 }
  r4.getCell(5).alignment = { horizontal: "right" }

  // Row 5: Header
  const r5 = worksheet.addRow(["NO ABS", "NISN", "NAMA SISWA", "L/P", "CATATAN / TAGIHAN TUGAS"])
  r5.font = { name: "Arial", size: 11, bold: true }
  r5.alignment = { horizontal: "center", vertical: "middle" }

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  }

  for (let col = 1; col <= 5; col++) {
    const cell = r5.getCell(col)
    cell.border = thinBorder
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F3F4F6" },
    }
  }

  // Data rows
  students.forEach((s) => {
    const r = worksheet.addRow([
      s.noAbs,
      s.nisn,
      s.nama.toUpperCase(),
      s.gender === "Laki-laki" || s.gender === "L" ? "L" : "P",
      s.catatan || "-",
    ])
    r.font = { name: "Arial", size: 10 }
    r.getCell(1).alignment = { horizontal: "center", vertical: "top" }
    r.getCell(2).alignment = { horizontal: "center", vertical: "top" }
    r.getCell(3).alignment = { horizontal: "left", vertical: "top" }
    r.getCell(4).alignment = { horizontal: "center", vertical: "top" }
    r.getCell(5).alignment = { horizontal: "left", vertical: "top", wrapText: true }

    for (let col = 1; col <= 5; col++) {
      r.getCell(col).border = thinBorder
    }
  })

  return workbook
}

export function generateCatatanBinaanPDFDoc(options: ExportCatatanBinaanOptions): jsPDF {
  const { students, kelas, tahun = "2025/2026", waliKelas = "-" } = options
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("DAFTAR TAGIHAN TUGAS & CATATAN SISWA", 105, 15, { align: "center" })

  doc.setFontSize(11)
  doc.text(`TAHUN PELAJARAN ${tahun}`, 105, 22, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(`KELAS : ${kelas.toUpperCase()}`, 14, 32)
  doc.text(`Wali Kelas : ${waliKelas}`, 196, 32, { align: "right" })

  autoTable(doc, {
    startY: 38,
    head: [["NO", "NISN", "NAMA SISWA", "L/P", "CATATAN / TAGIHAN TUGAS"]],
    body: students.map((s) => [
      s.noAbs,
      s.nisn,
      s.nama.toUpperCase(),
      s.gender === "Laki-laki" || s.gender === "L" ? "L" : "P",
      s.catatan || "-",
    ]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      lineWidth: 0.2,
      lineColor: [100, 100, 100],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { halign: "center", cellWidth: 28 },
      2: { halign: "left", cellWidth: 50 },
      3: { halign: "center", cellWidth: 14 },
      4: { halign: "left", cellWidth: "auto" },
    },
  })

  return doc
}

export async function exportCatatanBinaanToExcel(options: ExportCatatanBinaanOptions) {
  const workbook = await generateCatatanBinaanExcelWorkbook(options)
  const filename = `Tagihan_Tugas_Catatan_${options.kelas.toUpperCase()}.xlsx`

  if (typeof window !== "undefined") {
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export function exportCatatanBinaanToPDF(options: ExportCatatanBinaanOptions) {
  const doc = generateCatatanBinaanPDFDoc(options)
  const filename = `Tagihan_Tugas_Catatan_${options.kelas.toUpperCase()}.pdf`

  if (typeof window !== "undefined") {
    doc.save(filename)
  }
}

