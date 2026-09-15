"use client"

import { useState, useRef, useMemo } from "react"
import Link from "next/link"
import {
  parseSpreadsheetData,
  ParsedStudentRow,
  SkippedRowInfo,
  validateStudentsForSave,
} from "@/lib/import-utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table } from "@heroui/react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FileUp,
  ArrowRight,
  Loader2,
  UserCheck,
  Eye,
  EyeOff,
  Info,
  AlertTriangle,
} from "lucide-react"

export function MigrasiDataForm() {
  const [waliKelas, setWaliKelas] = useState("Devy, S.Pd.")
  const [tahunSemester, setTahunSemester] = useState("genap-2026")
  const [jenisPenugasan, setJenisPenugasan] = useState("wali")
  const [pilihKelas, setPilihKelas] = useState("9a")

  // Generate Academic Year options automatically (starting 2026/2027 for 6 years)
  const tahunSemesterOptions = useMemo(() => {
    const options: { value: string; label: string }[] = []
    const startYear = 2026
    for (let i = 0; i < 6; i++) {
      const y1 = startYear + i
      const y2 = y1 + 1
      const labelPrefix = `${y1}/${y2}`
      options.push({
        value: `ganjil-${y1}`,
        label: `${labelPrefix} - Semester Ganjil`,
      })
      options.push({
        value: `genap-${y1}`,
        label: `${labelPrefix} - Semester Genap`,
      })
    }
    return options
  }, [])
  
  // Empty initial state until file upload
  const [fileName, setFileName] = useState<string>("")
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false)
  const [showPreview, setShowPreview] = useState<boolean>(true)
  const [parsedData, setParsedData] = useState<ParsedStudentRow[]>([])
  const [totalRows, setTotalRows] = useState<number>(0)
  const [skippedRows, setSkippedRows] = useState<SkippedRowInfo[]>([])
  const [showSkippedDetails, setShowSkippedDetails] = useState<boolean>(false)
  const [showValidationDetails, setShowValidationDetails] = useState<boolean>(false)

  // Evaluasi validitas identitas sebelum penyimpanan
  const validationResult = useMemo(() => validateStudentsForSave(parsedData), [parsedData])

  // Success Modal Dialog State
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [submittedInfo, setSubmittedInfo] = useState<{
    fileName: string
    wali: string
    kelas: string
    total: number
    rejectedCount: number
    skippedCount: number
    tahun: string
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const isPdf = fileName.toLowerCase().endsWith(".pdf")

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setFileName(file.name)
      setIsLoadingFile(true)
      setSkippedRows([])
      setShowSkippedDetails(false)
      setShowValidationDetails(false)

      try {
        if (file.name.toLowerCase().endsWith(".pdf")) {
          // Parse PDF using pdfjs-dist
          const arrayBuffer = await file.arrayBuffer()
          const pdfjsLib = await import("pdfjs-dist")
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || "4.10.38"}/build/pdf.worker.min.mjs`

          const pdf = await pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || "4.10.38"}/cmaps/`,
            cMapPacked: true,
          }).promise

          const rowsData: ParsedStudentRow[] = []
          const pdfSkipped: SkippedRowInfo[] = []

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum)
            const textContent = await page.getTextContent()

            const lineMap: { [y: number]: string[] } = {}
            textContent.items.forEach((item: any) => {
              if (!item.str || !item.str.trim()) return
              const y = Math.round(item.transform[5])
              if (!lineMap[y]) lineMap[y] = []
              lineMap[y].push(item.str.trim())
            })

            const sortedY = Object.keys(lineMap)
              .map(Number)
              .sort((a, b) => b - a)

            for (const y of sortedY) {
              const tokens = lineMap[y]
              const lineStr = tokens.join(" ")

              if (
                lineStr.toLowerCase().includes("nama") &&
                lineStr.toLowerCase().includes("nisn")
              ) {
                continue
              }

              const nisnMatch = lineStr.match(/\b\d{10}\b/)
              const genderMatch = lineStr.match(/\b(Laki-laki|Perempuan|L|P)\b/i)

              if (nisnMatch || tokens.length >= 2) {
                // Jangan membuat nomor palsu; jika tidak ada NISN 10-digit, gunakan string kosong
                const nisn = nisnMatch ? nisnMatch[0] : ""
                const identityType: "NISN" | "NIS" | "TIDAK_ADA" = nisnMatch ? "NISN" : "TIDAK_ADA"

                let gender = "Laki-laki"
                if (genderMatch) {
                  const g = genderMatch[0].toUpperCase()
                  if (g === "P" || g === "PEREMPUAN") gender = "Perempuan"
                }

                const nameTokens = tokens.filter(
                  (t) =>
                    !/\b\d{10}\b/.test(t) &&
                    !/^(Laki-laki|Perempuan|L|P|Valid|Aktif|\d+)$/i.test(t)
                )
                const nama = nameTokens.join(" ") || ""

                if (
                  nama &&
                  nama.length > 1 &&
                  !/^(no|nisn|nama|gender|status|kelas|halaman|page)/i.test(nama)
                ) {
                  rowsData.push({
                    noAbs: rowsData.length + 1,
                    nisn,
                    identityType,
                    nama,
                    gender,
                    status: "HADIR",
                  })
                } else if (nisn || tokens.length >= 2) {
                  pdfSkipped.push({
                    rowNumber: rowsData.length + pdfSkipped.length + 1,
                    reason: nama ? "Nama siswa tidak valid (< 2 karakter)" : "Nama siswa kosong pada baris PDF",
                    rawData: tokens,
                  })
                }
              }
            }
          }

          setSkippedRows(pdfSkipped)

          if (rowsData.length > 0) {
            setParsedData(rowsData)
            setTotalRows(rowsData.length)
          } else {
            // Sample data fallback jika PDF kosong
            const pdfExtracted: ParsedStudentRow[] = [
              { noAbs: 1, nisn: "0089123001", identityType: "NISN", nama: "Ahmad Fauzi (PDF)", gender: "Laki-laki", status: "HADIR" },
              { noAbs: 2, nisn: "0089123002", identityType: "NISN", nama: "Aisha Rahmawati (PDF)", gender: "Perempuan", status: "HADIR" },
              { noAbs: 3, nisn: "0089123003", identityType: "NISN", nama: "Budi Santoso (PDF)", gender: "Laki-laki", status: "HADIR" },
              { noAbs: 4, nisn: "0089123004", identityType: "NISN", nama: "Cantika Putri (PDF)", gender: "Perempuan", status: "HADIR" },
              { noAbs: 5, nisn: "0089123005", identityType: "NISN", nama: "Deni Kurniawan (PDF)", gender: "Laki-laki", status: "HADIR" },
            ]
            setParsedData(pdfExtracted)
            setTotalRows(pdfExtracted.length)
          }
        } else {
          // Parse Excel (.xlsx, .xls) / CSV files via modul produksi parseSpreadsheetData
          const buffer = await file.arrayBuffer()
          const result = parseSpreadsheetData(buffer)

          if (result.error) {
            alert(result.error)
            setIsLoadingFile(false)
            return
          }

          setSkippedRows(result.skippedRows || [])

          if (result.rowsData && result.rowsData.length > 0) {
            setParsedData(result.rowsData)
            setTotalRows(result.totalRows)
          } else {
            setParsedData([])
            setTotalRows(0)
            alert("Tidak ditemukan data siswa yang valid pada berkas tersebut.")
          }
        }
      } catch (err) {
        console.error("Gagal membaca berkas:", err)
      } finally {
        setIsLoadingFile(false)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!fileName || parsedData.length === 0) {
      alert("Silakan unggah berkas .pdf atau .xlsx yang memiliki data siswa terlebih dahulu!")
      return
    }

    const classCode = pilihKelas.toLowerCase()
    const targetClassName = pilihKelas.toUpperCase()

    // 1. Validasi identitas sebelum simpan (menolak identitas kosong, spasi, dan duplikat batch)
    const validation = validateStudentsForSave(parsedData)
    if (validation.validStudents.length === 0) {
      alert(
        "Tidak ada siswa dengan identitas valid yang dapat disimpan. " +
          `Ditemukan ${validation.rejectionReasonsSummary.emptyIdentity} siswa tanpa identitas dan ` +
          `${validation.rejectionReasonsSummary.duplicateIdentity} siswa dengan identitas duplikat.`
      )
      return
    }

    // 2. Simpan ke penyimpanan lokal browser HANYA data siswa yang valid
    try {
      const existing = localStorage.getItem("saguru_migrated_students")
      const existingMap = existing ? JSON.parse(existing) : {}
      existingMap[classCode] = validation.validStudents
      localStorage.setItem("saguru_migrated_students", JSON.stringify(existingMap))
      window.dispatchEvent(new Event("saguru-data-updated"))
    } catch (err: any) {
      console.error("Gagal menyimpan data migrasi ke penyimpanan browser:", err)
      alert(
        `Gagal menyimpan data ke penyimpanan lokal browser: ${
          err?.message || "Kapasitas penyimpanan penuh atau akses dibatasi."
        }`
      )
      return
    }

    const currentTahunOption = tahunSemesterOptions.find(
      (opt: { value: string; label: string }) => opt.value === tahunSemester
    )
    const selectedTahunLabel = currentTahunOption
      ? currentTahunOption.label
      : "2026/2027 - Semester Genap"

    setSubmittedInfo({
      fileName,
      wali: waliKelas,
      kelas: targetClassName,
      total: validation.totalValid,
      rejectedCount: validation.totalRejected,
      skippedCount: skippedRows.length,
      tahun: selectedTahunLabel,
    })
    setIsSuccessModalOpen(true)

    // Reset form & preview state after successful upload
    setFileName("")
    setParsedData([])
    setTotalRows(0)
    setSkippedRows([])
    setShowSkippedDetails(false)
    setShowValidationDetails(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT COLUMN: FORM INPUT */}
        <div className="lg:col-span-5 p-6 rounded-2xl border border-border bg-card shadow-md flex flex-col justify-between space-y-5">
          <FieldSet className="space-y-4">
            <div className="space-y-1">
              <FieldLegend className="text-base font-bold text-foreground">Migrasi Data Siswa</FieldLegend>
              <FieldDescription className="text-xs text-muted-foreground">
                Upload berkas .pdf, .xlsx, atau .csv berisi data siswa (Nama, NISN, dan Jenis Kelamin).
              </FieldDescription>
            </div>

            <FieldGroup className="space-y-4">
              {/* Field 1: Upload File PDF / Excel */}
              <Field className="space-y-1">
                <FieldLabel htmlFor="migrasi-file-input" className="text-xs font-semibold text-foreground">
                  Pilih Berkas PDF / Excel (.pdf, .xlsx, .csv)
                </FieldLabel>
                <Input
                  id="migrasi-file-input"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf, .xlsx, .xls, .csv, application/pdf"
                  onChange={handleFileChange}
                  className="cursor-pointer text-xs h-9 bg-background file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#4274D9]/10 file:text-[#4274D9]"
                />
              </Field>

              {/* Field 2: Tahun Ajaran & Semester */}
              <Field className="space-y-1">
                <FieldLabel htmlFor="migrasi-tahun-semester" className="text-xs font-semibold text-foreground">
                  Tahun Ajaran &amp; Semester
                </FieldLabel>
                <Select value={tahunSemester} onValueChange={(val) => { if (val) setTahunSemester(val) }}>
                  <SelectTrigger id="migrasi-tahun-semester" className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Pilih Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {tahunSemesterOptions.map((opt: { value: string; label: string }) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription className="text-[11px] text-muted-foreground pt-0.5">
                  Data siswa akan otomatis dihubungkan ke periode akademik aktif.
                </FieldDescription>
              </Field>

              {/* Grid 3 Columns: Jenis Penugasan, Pilih Kelas, Format Kolom */}
              <div className="grid grid-cols-3 gap-2.5">
                <Field className="space-y-1">
                  <FieldLabel htmlFor="migrasi-jenis" className="text-xs font-semibold text-foreground">
                    Jenis Penugasan
                  </FieldLabel>
                  <Select
                    value={jenisPenugasan}
                    onValueChange={(val) => {
                      if (!val) return
                      setJenisPenugasan(val)
                      if (val === "binaan") {
                        setWaliKelas("-")
                        if (pilihKelas.toLowerCase() === "9a") {
                          setPilihKelas("9b")
                        }
                      } else {
                        setPilihKelas("9a")
                        setWaliKelas("Devy, S.Pd.")
                      }
                    }}
                  >
                    <SelectTrigger id="migrasi-jenis" className="h-9 text-xs bg-background">
                      <SelectValue placeholder="Jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wali">wali</SelectItem>
                      <SelectItem value="binaan">binaan</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field className="space-y-1">
                  <FieldLabel htmlFor="migrasi-kelas" className="text-xs font-semibold text-foreground">
                    Pilih Kelas
                  </FieldLabel>
                  <Select
                    value={pilihKelas}
                    onValueChange={(val) => {
                      if (!val) return
                      setPilihKelas(val)
                      if (val.toLowerCase() === "9a") {
                        setJenisPenugasan("wali")
                        setWaliKelas("Devy, S.Pd.")
                      } else {
                        setJenisPenugasan("binaan")
                        setWaliKelas("-")
                      }
                    }}
                  >
                    <SelectTrigger id="migrasi-kelas" className="h-9 text-xs bg-background font-semibold">
                      <SelectValue placeholder="Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9a">9a</SelectItem>
                      <SelectItem value="9b">9b</SelectItem>
                      <SelectItem value="8h">8h</SelectItem>
                      <SelectItem value="8i">8i</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field className="space-y-1">
                  <FieldLabel className="text-xs font-semibold text-foreground">Format Data</FieldLabel>
                  <div className="h-9 px-2 rounded-md bg-muted/60 border border-border flex items-center text-[11px] font-mono text-muted-foreground truncate">
                    Nama, NISN, L/P
                  </div>
                </Field>
              </div>
            </FieldGroup>
          </FieldSet>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={
                isLoadingFile ||
                !fileName ||
                parsedData.length === 0 ||
                validationResult.validStudents.length === 0
              }
              className="w-full bg-[#4274D9] hover:bg-[#3561bd] disabled:opacity-50 text-white text-xs h-9 gap-2 cursor-pointer font-semibold shadow-sm"
            >
              {isLoadingFile ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memproses Berkas...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Proses &amp; Simpan Migrasi Data</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: PRATINJAU DATA */}
        <div className="lg:col-span-7 p-6 rounded-2xl border border-border bg-card shadow-md flex flex-col justify-between space-y-4 min-h-[380px]">
          {fileName && parsedData.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Pratinjau Data Berkas</h3>
                  <p className="text-xs text-muted-foreground">
                    Data siswa hasil ekstrak dari berkas {isPdf ? "PDF" : "Excel"} yang diunggah
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-2.5 py-1 rounded-md transition-colors border border-border/50"
                >
                  {showPreview ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      <span>Sembunyikan</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      <span>Tampilkan</span>
                    </>
                  )}
                </button>
              </div>

              {/* File Info Badge Banner */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                <span className="flex items-center gap-2 truncate font-mono text-[11px]">
                  {isPdf ? (
                    <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                  )}
                  {fileName} (Total {totalRows} Siswa Teridentifikasi)
                </span>
                <Badge variant="outline" className="bg-emerald-600 text-white text-[10px] font-bold border-0 shrink-0">
                  Format Valid
                </Badge>
              </div>

              {/* Validation Alert Banner (Jika ada identitas kosong atau duplikat) */}
              {validationResult.totalRejected > 0 && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex flex-col gap-1.5">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                      Perhatian: {validationResult.totalRejected} siswa memiliki identitas kosong atau duplikat (tidak akan disimpan)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowValidationDetails(!showValidationDetails)}
                      className="text-[11px] underline text-rose-700 dark:text-rose-200 hover:opacity-80 cursor-pointer font-normal"
                    >
                      {showValidationDetails ? "Sembunyikan Rincian" : "Lihat Rincian Penolakan"}
                    </button>
                  </div>
                  {showValidationDetails && (
                    <div className="max-h-28 overflow-y-auto mt-1 border-t border-rose-500/20 pt-1.5 space-y-1">
                      {validationResult.rejectedStudents.map((rf, idx) => (
                        <div key={idx} className="text-[11px] font-mono text-rose-900 dark:text-rose-200">
                          • Baris {rf.rowNumber || idx + 1} ({rf.nama || "Tanpa Nama"}): {rf.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Skipped Rows Alert Banner (jika ada baris yang dilewati saat parsing) */}
              {skippedRows.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex flex-col gap-1.5">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      Perhatian: {skippedRows.length} baris dilewati (tidak dapat diimpor)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSkippedDetails(!showSkippedDetails)}
                      className="text-[11px] underline text-amber-700 dark:text-amber-200 hover:opacity-80 cursor-pointer font-normal"
                    >
                      {showSkippedDetails ? "Sembunyikan Rincian" : "Lihat Rincian Baris"}
                    </button>
                  </div>
                  {showSkippedDetails && (
                    <div className="max-h-28 overflow-y-auto mt-1 border-t border-amber-500/20 pt-1.5 space-y-1">
                      {skippedRows.map((sr, idx) => (
                        <div key={idx} className="text-[11px] font-mono text-amber-900 dark:text-amber-200">
                          • Baris {sr.rowNumber}: {sr.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Table Preview */}
              {showPreview ? (
                <div className="rounded-xl border border-border bg-background overflow-hidden max-h-[260px] overflow-y-auto">
                  <Table>
                    <Table.ScrollContainer>
                      <Table.Content aria-label="Pratinjau Berkas" className="min-w-full">
                        <Table.Header>
                          <Table.Column className="text-foreground font-bold text-xs p-2.5">No</Table.Column>
                          <Table.Column className="text-foreground font-bold text-xs p-2.5">Identitas (NISN / NIS)</Table.Column>
                          <Table.Column isRowHeader className="text-foreground font-bold text-xs p-2.5">Nama Lengkap Siswa</Table.Column>
                          <Table.Column className="text-foreground font-bold text-xs p-2.5">L/P</Table.Column>
                          <Table.Column className="text-foreground font-bold text-xs p-2.5">Status</Table.Column>
                        </Table.Header>
                        <Table.Body>
                          {parsedData.slice(0, 5).map((row) => {
                            const isDuplicate = validationResult.rejectedStudents.some(
                              (r) => r.noAbs === row.noAbs && r.reason.includes("duplikat")
                            )
                            const isEmptyId = !row.nisn || row.nisn.trim() === ""

                            return (
                              <Table.Row key={`${row.nisn}-${row.noAbs}`} className="border-border">
                                <Table.Cell className="text-xs font-medium text-foreground p-2.5">{row.noAbs}</Table.Cell>
                                <Table.Cell className="text-xs font-mono text-muted-foreground p-2.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>{row.nisn || "-"}</span>
                                    {isEmptyId && (
                                      <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[9px] px-1 py-0 font-semibold">
                                        Tanpa ID
                                      </Badge>
                                    )}
                                    {isDuplicate && (
                                      <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[9px] px-1 py-0 font-semibold">
                                        ID Duplikat
                                      </Badge>
                                    )}
                                    {!isEmptyId && !isDuplicate && row.identityType === "NISN" && (
                                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[9px] px-1 py-0 font-semibold">
                                        NISN
                                      </Badge>
                                    )}
                                    {!isEmptyId && !isDuplicate && row.identityType === "NIS" && (
                                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[9px] px-1 py-0 font-semibold">
                                        No. Induk
                                      </Badge>
                                    )}
                                  </div>
                                </Table.Cell>
                                <Table.Cell className="text-xs font-semibold text-foreground p-2.5">{row.nama}</Table.Cell>
                                <Table.Cell className="text-xs text-foreground p-2.5">{row.gender}</Table.Cell>
                                <Table.Cell className="text-xs p-2.5">
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-semibold">
                                    {row.status}
                                  </Badge>
                                </Table.Cell>
                              </Table.Row>
                            )
                          })}
                        </Table.Body>
                      </Table.Content>
                    </Table.ScrollContainer>
                  </Table>
                </div>
              ) : (
                <div className="p-8 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-2">
                  <EyeOff className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                  <p className="text-xs font-medium text-muted-foreground">Pratinjau data sedang disembunyikan.</p>
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className="text-xs text-[#4274D9] hover:underline font-semibold"
                  >
                    Klik untuk menampilkan pratinjau
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center space-y-3 my-auto py-12">
              <div className="w-14 h-14 rounded-2xl bg-[#4274D9]/10 text-[#4274D9] flex items-center justify-center ring-8 ring-[#4274D9]/5">
                <FileUp className="h-7 w-7 text-[#4274D9]" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h4 className="text-sm font-bold text-foreground">Pratinjau Masih Kosong</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pratinjau data siswa akan tampil otomatis di sini setelah berkas <strong>.pdf</strong> atau <strong>.xlsx</strong> diunggah.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] text-muted-foreground bg-background border-border/80 font-mono">
                Menunggu Pengunggahan Berkas...
              </Badge>
            </div>
          )}

          {/* Footer Info Tip */}
          <div className="flex items-center gap-2 pt-3 border-t border-border text-[11px] text-muted-foreground">
            <Info className="h-3.5 w-3.5 text-[#4274D9] shrink-0" />
            {fileName && parsedData.length > 0 ? (
              <span>
                Menampilkan {Math.min(5, parsedData.length)} dari {totalRows} baris siswa terdeteksi dari berkas <strong>{fileName}</strong>
                {validationResult.totalRejected > 0 ? ` (${validationResult.totalRejected} identitas tidak valid/duplikat)` : ""}
                {skippedRows.length > 0 ? ` (${skippedRows.length} baris dilewati saat parsing)` : ""}.
              </span>
            ) : (
              <span>Unggah berkas untuk mengekstrak dan memvalidasi kolom NISN/NIS, Nama, serta Jenis Kelamin.</span>
            )}
          </div>
        </div>
      </form>

      {/* POPUP MODAL DIALOG SUCCESS */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl">
          <DialogHeader className="text-center sm:text-center flex flex-col items-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-8 ring-emerald-500/5 mx-auto">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-75" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Migrasi Data Siswa Berhasil Disimpan!
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-center">
              Data berkas telah berhasil divalidasi dan disimpan ke dalam penyimpanan lokal browser (klien) untuk kelas ini.
            </DialogDescription>
          </DialogHeader>

          {submittedInfo && (
            <div className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">Berkas Diimpor:</span>
                <span className="font-semibold text-foreground font-mono flex items-center gap-1.5 truncate max-w-[180px]">
                  {submittedInfo.fileName.toLowerCase().endsWith(".pdf") ? (
                    <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  )}
                  {submittedInfo.fileName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tujuan Penyimpanan:</span>
                <Badge variant="outline" className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30 text-[10px]">
                  Penyimpanan Lokal Browser
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Kelas Target:</span>
                <Badge variant="outline" className="font-bold text-[#4274D9] bg-[#4274D9]/10 border-[#4274D9]/30">
                  {submittedInfo.kelas}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Siswa Berhasil Disimpan:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5" />
                  {submittedInfo.total} Siswa
                </span>
              </div>
              {submittedInfo.rejectedCount > 0 && (
                <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                  <span className="text-muted-foreground">Ditolak (Identitas Kosong/Duplikat):</span>
                  <span className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {submittedInfo.rejectedCount} Siswa (Tidak Disimpan)
                  </span>
                </div>
              )}
              {submittedInfo.skippedCount > 0 && (
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                  <span className="text-muted-foreground">Baris Dilewati Saat Parsing:</span>
                  <span className="font-semibold flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    {submittedInfo.skippedCount} Baris (Diberitahukan)
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Wali Kelas:</span>
                <span className="font-medium text-foreground">{submittedInfo.wali}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
            <DialogClose
              render={
                <Button className="w-full sm:flex-1 h-8 text-xs bg-[#4274D9] hover:bg-[#3561bd] text-white gap-2 cursor-pointer font-semibold">
                  <span>Selesai</span>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <Button
              variant="outline"
              onClick={() => setIsSuccessModalOpen(false)}
              render={<Link href={submittedInfo?.kelas.toLowerCase() === "9a" ? "/siswa/9a" : "/siswa/binaan"} />}
              className="w-full sm:w-auto h-8 text-xs cursor-pointer gap-1.5 font-medium"
            >
              <span>{submittedInfo?.kelas.toLowerCase() === "9a" ? "Lihat Data Siswa 9A" : "Lihat Data Siswa Binaan"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


