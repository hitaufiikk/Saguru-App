"use client"

import { useState, useRef, useMemo, useEffect, useCallback, useSyncExternalStore } from "react"
import Link from "next/link"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faFilePdf } from "@fortawesome/free-solid-svg-icons"
import {
  parseSpreadsheetData,
  ParsedStudentRow,
  SkippedRowInfo,
  validateStudentsForSave,
  mergeStudentsCache,
  CachedStudentItem,
} from "@/lib/import-utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { studentService } from "@/lib/services/studentService"
import { profileService, type UserProfileRecord } from "@/lib/services/profileService"
import { getBannerTimeInfo } from "@/lib/school-date"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuGroup, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
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
  ChevronDown,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  ArrowRight,
  Loader2,
  UserCheck,
  Eye,
  EyeOff,
  Info,
  AlertTriangle,
  X,
} from "lucide-react"

const emptySubscribe = () => () => { }

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export function MigrasiDataForm() {
  const isMounted = useIsMounted()
  const [pilihKelas, setPilihKelas] = useState("9a")

  // Pilihan periode hanya untuk tampilan; belum menjadi atribut penyimpanan siswa.
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const academicPeriods = useMemo(() => {
    if (!isMounted) return null
    const info = getBannerTimeInfo(new Date())
    const yearLabel = info.tahunAjaran.replace("Tahun Ajaran ", "")
    const startYear = Number(yearLabel.split("/")[0])
    return {
      current: `${info.semester.replace("Semester ", "")} · ${yearLabel}`,
      options: [startYear - 1, startYear, startYear + 1].flatMap((year) =>
        ["Ganjil", "Genap"].map((semester) => `${semester} · ${year}/${year + 1}`)
      ),
    }
  }, [isMounted])

  // Profil guru sebenarnya dari profileService (tanpa fallback 9A)
  const [teacherProfile, setTeacherProfile] = useState<UserProfileRecord | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileReloadKey, setProfileReloadKey] = useState(0)

  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      try {
        const p = await profileService.getProfile()
        if (!isMounted) return
        setTeacherProfile(p)
        setProfileError(null)
      } catch (err) {
        if (!isMounted) return
        console.warn("Gagal memuat profil guru:", err)
        setProfileError("Gagal memuat profil guru.")
      } finally {
        if (isMounted) {
          setIsProfileLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      isMounted = false
    }
  }, [profileReloadKey])

  const handleRetryProfile = useCallback(() => {
    setIsProfileLoading(true)
    setProfileError(null)
    setProfileReloadKey((k) => k + 1)
  }, [])

  // Penugasan otomatis mengikuti kelas tujuan dan profil sebenarnya
  const cleanSelectedClass = (pilihKelas || "").trim().toUpperCase()
  const teacherWaliKelas = (teacherProfile?.waliKelas || "").trim().toUpperCase()
  // Nilai kosong berarti TIDAK memiliki kelas perwalian, bukan otomatis 9A
  const hasWaliAssignment = Boolean(teacherWaliKelas && teacherWaliKelas !== "-" && teacherWaliKelas !== "NONE")
  const isWaliKelasForSelected = Boolean(hasWaliAssignment && cleanSelectedClass === teacherWaliKelas)

  const penugasanLabel = isProfileLoading
    ? "Memuat penugasan..."
    : profileError
      ? "Gagal memuat profil"
      : isWaliKelasForSelected
        ? "Wali Kelas"
        : "Guru Mapel"

  const resolvedWaliKelas = isWaliKelasForSelected
    ? (teacherProfile?.name || "-")
    : "-"

  // Empty initial state until file upload
  const [fileName, setFileName] = useState<string>("")
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
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
    cacheFailed?: boolean
    cacheErrorMessage?: string
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const isPdf = fileName.toLowerCase().endsWith(".pdf")

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setFileName(file.name)
      setIsLoadingFile(true)
      setParsedData([])
      setTotalRows(0)
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
            textContent.items.forEach((item: unknown) => {
              const textItem = item as { str?: string; transform?: number[] }
              if (!textItem.str || !textItem.str.trim()) return
              const y = Math.round(textItem.transform?.[5] ?? 0)
              if (!lineMap[y]) lineMap[y] = []
              lineMap[y].push(textItem.str.trim())
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
            // PDF tidak menghasilkan data valid: kosongkan dan beri tahu pengguna tanpa fallback data contoh palsu
            setParsedData([])
            setTotalRows(0)
            alert("Tidak ditemukan data siswa yang valid pada berkas PDF tersebut.")
          }
        } else {
          // Parse Excel (.xlsx, .xls) / CSV files via modul produksi parseSpreadsheetData
          const buffer = await file.arrayBuffer()
          const result = parseSpreadsheetData(buffer)

          if (result.error) {
            alert(result.error)
            setParsedData([])
            setTotalRows(0)
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
      } catch (err: unknown) {
        console.error("Gagal membaca berkas:", err)
        setParsedData([])
        setTotalRows(0)
        const errorMsg = err instanceof Error ? err.message : String(err)
        alert(`Gagal membaca berkas: ${errorMsg}`)
      } finally {
        setIsLoadingFile(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Penjagaan submit ganda
    if (isSaving) return

    // Jangan menyimpan memakai penugasan tebakan jika profil masih dimuat atau gagal
    if (isProfileLoading) {
      alert("Profil guru sedang dimuat. Mohon tunggu sebentar sebelum menyimpan data.")
      return
    }

    if (profileError || !teacherProfile) {
      alert("Profil guru belum berhasil dimuat. Silakan muat ulang sebelum menyimpan data.")
      return
    }

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

    setIsSaving(true)

    try {
      // 2. Simpan ke Supabase terlebih dahulu sebagai penyimpanan utama
      const saveResult = await studentService.saveMigratedStudents(
        validation.validStudents,
        classCode,
        resolvedWaliKelas
      )

      if (!saveResult.success) {
        // Jika Supabase gagal, pertahankan berkas dan pratinjau agar bisa dicoba kembali
        alert(saveResult.error || "Gagal menyimpan data siswa ke database Supabase.")
        return
      }

      // 3. Setelah Supabase berhasil, perbarui cache lokal dengan mempertahankan siswa lain
      let cacheFailed = false
      let cacheErrorMessage = ""
      try {
        const existing = localStorage.getItem("saguru_migrated_students")
        const existingMap: Record<string, CachedStudentItem[]> = existing ? JSON.parse(existing) : {}
        const updatedMap = mergeStudentsCache(existingMap, classCode, validation.validStudents)
        localStorage.setItem("saguru_migrated_students", JSON.stringify(updatedMap))
        window.dispatchEvent(new Event("saguru-data-updated"))
      } catch (cacheErr: unknown) {
        console.error("Gagal memperbarui cache lokal browser:", cacheErr)
        cacheFailed = true
        cacheErrorMessage =
          cacheErr instanceof Error ? cacheErr.message : "Kapasitas penyimpanan lokal penuh atau akses dibatasi."
      }

      // 4. Jika cache lokal gagal setelah Supabase berhasil, jelaskan bahwa data sudah tersimpan di server
      if (cacheFailed) {
        alert(
          "PERHATIAN: Data siswa telah BERHASIL disimpan ke database server Supabase. " +
          `Namun, sinkronisasi cache lokal peramban gagal (${cacheErrorMessage}). ` +
          "Data Anda aman di server dan akan disinkronkan saat membuka tabel siswa."
        )
      }

      setSubmittedInfo({
        fileName,
        wali: resolvedWaliKelas,
        kelas: targetClassName,
        total: validation.totalValid,
        rejectedCount: validation.totalRejected,
        skippedCount: skippedRows.length,
        cacheFailed,
        cacheErrorMessage,
      })
      setIsSuccessModalOpen(true)

      // Reset form & preview state hanya setelah penyimpanan Supabase berhasil
      setFileName("")
      setParsedData([])
      setTotalRows(0)
      setSkippedRows([])
      setShowSkippedDetails(false)
      setShowValidationDetails(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err: unknown) {
      console.error("Kesalahan tak terduga saat menyimpan migrasi data:", err)
      const errorMsg = err instanceof Error ? err.message : String(err)
      alert(`Terjadi kesalahan tak terduga: ${errorMsg}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: FORM INPUT */}
        <Card className="lg:col-span-5 border-border bg-card shadow-sm p-0 overflow-hidden">
          <CardHeader className="p-5 pb-4">
            <CardTitle className="text-base font-bold text-foreground">
              Impor Data Siswa
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Unggah berkas untuk mendaftarkan data siswa ke dalam kelas tujuan.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-0 space-y-4">
            <FieldGroup className="space-y-4">
              {/* Field 1: Pilih Kelas Tujuan */}
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="migrasi-kelas" className="text-xs font-semibold text-foreground">
                  Pilih Kelas Tujuan
                </FieldLabel>
                <Select
                  value={pilihKelas}
                  disabled={isSaving}
                  onValueChange={(val) => {
                    if (val) setPilihKelas(val)
                  }}
                >
                  <SelectTrigger
                    id="migrasi-kelas"
                    className="h-9 text-xs bg-background font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9a">9A</SelectItem>
                    <SelectItem value="9b">9B</SelectItem>
                    <SelectItem value="8h">8H</SelectItem>
                    <SelectItem value="8i">8I</SelectItem>
                  </SelectContent>
                </Select>
                <FieldDescription className="text-[11px] text-muted-foreground">
                  Pilihan kelas utama. Penugasan guru akan otomatis mengikuti kelas yang dipilih.
                </FieldDescription>
              </Field>

              {/* Field 2: Informasi Periode Akademik & Penugasan Guru */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Info Periode Otomatis */}
                <Field className="space-y-1.5">
                  <FieldLabel htmlFor="migrasi-periode" className="text-xs font-semibold text-foreground">
                    Tahun Ajaran &amp; Semester
                  </FieldLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      disabled={isSaving || isLoadingFile || !academicPeriods}
                      render={<Button id="migrasi-periode" type="button" variant="outline" className="h-9 w-full min-w-0 justify-between gap-2 text-xs font-medium" />}
                    >
                      <span className="truncate">{selectedPeriod ?? academicPeriods?.current ?? "Memuat periode…"}</span>
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Pilih periode akademik</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={selectedPeriod ?? academicPeriods?.current ?? ""} onValueChange={(value) => setSelectedPeriod(value)}>
                          {academicPeriods?.options.map((period) => (
                            <DropdownMenuRadioItem key={period} value={period} className="text-xs">{period}</DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Field>

                {/* Info Penugasan Guru Otomatis */}
                <Field className="space-y-1.5">
                  <FieldLabel className="text-xs font-semibold text-foreground">
                    Penugasan Guru
                  </FieldLabel>
                  <div className="h-9 px-3 rounded-md bg-muted/50 border border-border flex items-center justify-between text-xs">
                    {isProfileLoading ? (
                      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <Loader2 className="h-3 w-3 animate-spin text-[#4274D9]" />
                        <span>Memuat profil...</span>
                      </span>
                    ) : profileError ? (
                      <div className="flex items-center justify-between w-full text-rose-500 text-[11px]">
                        <span className="truncate">Gagal memuat</span>
                        <button
                          type="button"
                          onClick={handleRetryProfile}
                          className="underline hover:text-rose-600 cursor-pointer font-medium ml-1"
                        >
                          Coba lagi
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 truncate">
                        <Badge variant="secondary">
                          {penugasanLabel}
                        </Badge>
                        <span className="truncate text-foreground font-medium text-xs" title={teacherProfile?.name}>
                          {teacherProfile?.name || "-"}
                        </span>
                      </div>
                    )}
                  </div>
                </Field>
              </div>

              {/* Field 3: Pilih Berkas */}
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="migrasi-file-input" className="text-xs font-semibold text-foreground">
                  Pilih Berkas
                </FieldLabel>
                <FieldDescription className="text-[11px] text-muted-foreground">
                  {isProfileLoading
                    ? "Menyesuaikan dengan profil guru..."
                    : profileError
                      ? "Profil gagal dimuat."
                      : isWaliKelasForSelected
                        ? `Kelas perwalian: ${cleanSelectedClass}`
                        : `Guru mapel: Kelas ${cleanSelectedClass}`}
                </FieldDescription>
                <div className="flex items-center gap-3">
                  <input
                    id="migrasi-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv, .pdf, application/pdf"
                    onChange={handleFileChange}
                    disabled={isSaving || isLoadingFile}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    disabled={isSaving || isLoadingFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 px-4 rounded-lg text-xs font-medium bg-muted/60 dark:bg-[#161c28] hover:bg-muted dark:hover:bg-[#1f2737] border border-border dark:border-[#2b3548] text-foreground hover:border-[#4274D9]/60 hover:text-[#4274D9] cursor-pointer transition-colors shadow-2xs shrink-0"
                  >
                    {isLoadingFile ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4274D9]" />
                        <span>Memproses...</span>
                      </span>
                    ) : (
                      "Browse File"
                    )}
                  </Button>
                  {fileName ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="text-xs font-mono text-foreground truncate max-w-[190px] sm:max-w-[220px] px-2 py-1 rounded bg-muted/50 border border-border flex items-center gap-1.5"
                        title={fileName}
                      >
                        {isPdf ? (
                          <FileText className="h-3.5 w-3.5 text-[#4274D9] shrink-0" />
                        ) : (
                          <FileSpreadsheet className="h-3.5 w-3.5 text-[#4274D9] shrink-0" />
                        )}
                        <span className="truncate">{fileName}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFileName("")
                          setParsedData([])
                          setTotalRows(0)
                          setSkippedRows([])
                          if (fileInputRef.current) fileInputRef.current.value = ""
                        }}
                        disabled={isSaving || isLoadingFile}
                        className="text-muted-foreground hover:text-rose-500 p-1 rounded-md transition-colors cursor-pointer text-xs shrink-0"
                        title="Hapus berkas terpilih"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground truncate">
                      Belum ada berkas dipilih
                    </span>
                  )}
                </div>
                <FieldDescription className="text-[11px] text-muted-foreground">
                  Kolom berkas: Nama, NIS/NISN, dan Jenis kelamin. Format berkas: Excel (.xlsx, .xls), CSV (.csv), atau PDF (.pdf).
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>

          {/* CardFooter: Submit Button (tanpa mt-auto) */}
          <CardFooter className="p-5 pt-3 border-t border-border">
            <Button
              type="submit"
              disabled={
                isSaving ||
                isLoadingFile ||
                isProfileLoading ||
                Boolean(profileError) ||
                !teacherProfile ||
                !fileName ||
                parsedData.length === 0 ||
                validationResult.validStudents.length === 0
              }
              className="w-full bg-[#4274D9] hover:bg-[#3561bd] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs h-9 gap-2 cursor-pointer font-semibold shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan ke Supabase...</span>
                </>
              ) : isLoadingFile ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memproses Berkas...</span>
                </>
              ) : isProfileLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memuat Profil Guru...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <p>Simpan</p>
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* RIGHT COLUMN: PRATINJAU DATA */}
        <div className="lg:col-span-7 p-4 sm:p-6 rounded-2xl border border-border bg-card shadow-md flex flex-col justify-between space-y-4 min-h-[380px]">
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
                      <Table.Content aria-label="Pratinjau Berkas" className="min-w-[480px]">
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
              <div className="p-2.5 shrink-0 transition-transform duration-200 hover:scale-110">
                <FontAwesomeIcon
                  icon={faFilePdf}
                  aria-hidden="true"
                  style={{ color: "rgb(116, 192, 252)", width: 26, height: 26 }}
                />
              </div>
              <div className="space-y-1 max-w-xs">
                <h4 className="text-sm font-bold text-foreground">Pratinjau Masih Kosong</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Upload data untuk melihat pratinjau <strong>.pdf</strong> atau <strong>.xlsx</strong> diunggah.
                </p>
              </div>
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
              <span>Unggah berkas</span>
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
              Data berkas telah berhasil divalidasi dan disimpan ke database server Supabase sebagai penyimpanan utama.
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
                  Database Server Supabase (Utama)
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
              {submittedInfo.cacheFailed && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-[11px] leading-relaxed">
                  <strong>Catatan Cache:</strong> Data telah aman tersimpan di database server Supabase. Namun, pembaruan cache peramban lokal mengalami kendala ({submittedInfo.cacheErrorMessage}).
                </div>
              )}
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
              nativeButton={false}
              onClick={() => setIsSuccessModalOpen(false)}
              render={<Link href={`/siswa/${submittedInfo?.kelas.toLowerCase() || "9a"}`} />}
              className="w-full sm:w-auto h-8 text-xs cursor-pointer gap-1.5 font-medium"
            >
              <span>{`Lihat Data Siswa ${submittedInfo?.kelas || "9A"}`}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
