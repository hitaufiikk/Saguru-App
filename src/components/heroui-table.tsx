"use client"

import { useState, useEffect, useRef } from "react";
import { Table } from "@heroui/react";
import { Edit3, Search, UserPlus, Download, FileText, FileSpreadsheet, RotateCcw, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
} from "@/components/ui/popover"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  exportToExcel,
  exportToPDF,
  exportMonthlyPresensiToExcel,
  exportMonthlyPresensiToPDF,
  buildStudentMonthlyAttendance,
  getFormattedCurrentDate,
  getFormattedCurrentDateTime,
} from "@/lib/export-utils"
import { studentService } from "@/lib/services/studentService"
import { schoolDate } from "@/lib/school-date"
import { presensiService } from "@/lib/services/presensiService"

const NAMA_BULAN_INDONESIA = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

export interface StudentItem {
  noAbs: number
  nisn: string
  nama: string
  gender: string
  status?: string
  alasanDispen?: string
}

const studentData: StudentItem[] = [
  { noAbs: 1, nisn: "0081234561", nama: "Ahmad Fauzi", gender: "Laki-laki", status: "HADIR", alasanDispen: "" },
  { noAbs: 2, nisn: "0081234562", nama: "Aisha Rahma", gender: "Perempuan", status: "HADIR", alasanDispen: "" },
  { noAbs: 3, nisn: "0081234563", nama: "Budi Santoso", gender: "Laki-laki", status: "HADIR", alasanDispen: "" },
  { noAbs: 4, nisn: "0081234564", nama: "Cantika Putri", gender: "Perempuan", status: "HADIR", alasanDispen: "" },
  { noAbs: 5, nisn: "0081234565", nama: "Deni Kurniawan", gender: "Laki-laki", status: "HADIR", alasanDispen: "" },
  { noAbs: 6, nisn: "0081234566", nama: "Dewi Lestari", gender: "Perempuan", status: "HADIR", alasanDispen: "" },
  { noAbs: 7, nisn: "0081234567", nama: "Eko Prasetyo", gender: "Laki-laki", status: "HADIR", alasanDispen: "" },
  { noAbs: 8, nisn: "0081234568", nama: "Fitri Handayani", gender: "Perempuan", status: "HADIR", alasanDispen: "" },
  { noAbs: 9, nisn: "0081234569", nama: "Gilang Ramadhan", gender: "Laki-laki", status: "HADIR", alasanDispen: "" },
  { noAbs: 10, nisn: "0081234570", nama: "Hania Nabila", gender: "Perempuan", status: "HADIR", alasanDispen: "" },
  { noAbs: 11, nisn: "0081234571", nama: "Indra Wijaya", gender: "Laki-laki", status: "HADIR", alasanDispen: "" },
  { noAbs: 12, nisn: "0081234572", nama: "Jasmine Kartika", gender: "Perempuan", status: "HADIR", alasanDispen: "" },
  { noAbs: 13, nisn: "0081234573", nama: "Kevin Pratama", gender: "Laki-laki", status: "HADIR", alasanDispen: "" },
  { noAbs: 14, nisn: "0081234574", nama: "Larasati Anggraini", gender: "Perempuan", status: "HADIR", alasanDispen: "" },
  { noAbs: 15, nisn: "0081234575", nama: "Muhammad Rizky", gender: "Laki-laki", status: "HADIR", alasanDispen: "" },
]

export function DialogDemo() {
  return (
    <Dialog>
      <form onSubmit={(e) => e.preventDefault()}>
        <DialogTrigger render={<Button variant="outline">Open Dialog</Button>} />
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit data siswa</DialogTitle>
            <DialogDescription>
              Masukkan data yang ingin diubah
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="space-y-3">
            <Field>
              <Label htmlFor="name-1">Nama</Label>
              <Input id="name-1" name="name" defaultValue="Pedro Duarte" />
            </Field>
            <Field>
              <Label htmlFor="username-1">Username</Label>
              <Input id="username-1" name="username" defaultValue="@peduarte" />
            </Field>
            <Field>
              <Label className="text-sm font-medium text-foreground">L/P</Label>
              <RadioGroup defaultValue="cowok" className="flex items-center gap-6 mt-1">
                <div className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="cowok" id="r-cowok-demo" />
                  <Label htmlFor="r-cowok-demo" className="text-sm font-medium cursor-pointer">Cowok</Label>
                </div>
                <div className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="cewek" id="r-cewek-demo" />
                  <Label htmlFor="r-cewek-demo" className="text-sm font-medium cursor-pointer">Cewek</Label>
                </div>
              </RadioGroup>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <DialogClose render={<Button variant="outline">Batal</Button>} />
            <Button type="submit" className="bg-[#4274D9] hover:bg-[#3561bd] text-white">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}

const VALID_ATTENDANCE_STATUSES = ["HADIR", "DISPEN", "SAKIT", "ALPHA"]

const getValidAttendanceStatus = (status?: string): string => {
  if (status && VALID_ATTENDANCE_STATUSES.includes(status)) {
    return status
  }
  return "BELUM_DICATAT"
}

export function Basic({ kelasCode = "9a" }: { kelasCode?: string } = {}) {
  const [students, setStudents] = useState<StudentItem[]>([])

  const [selectedDate, setSelectedDate] = useState("")
  const [loadedKey, setLoadedKey] = useState("")
  const [loadError, setLoadError] = useState("")
  const [reload, setReload] = useState(0)
  const [savingNisn, setSavingNisn] = useState<string | null>(null)
  const savingRef = useRef(false)
  const requestVersion = useRef(0)
  const dataKey = `${kelasCode.toLowerCase()}:${selectedDate}`
  const ready = Boolean(selectedDate && loadedKey === dataKey && !loadError)
  const exportTanggal = selectedDate

  // Bulan dan Tahun Presensi
  const [selectedBulan, setSelectedBulan] = useState<number>(8)
  const [selectedTahun, setSelectedTahun] = useState<number>(2026)

  // Sinkronkan selectedBulan dan selectedTahun setiap kali selectedDate berubah
  useEffect(() => {
    if (selectedDate) {
      const parts = selectedDate.split("-")
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10)
        const m = parseInt(parts[1], 10)
        if (!isNaN(y) && !isNaN(m)) {
          setSelectedTahun(y)
          setSelectedBulan(m)
        }
      }
    }
  }, [selectedDate])

  const handleBulanChange = (newMonthStr: string | null) => {
    if (!newMonthStr) return
    const newMonth = parseInt(newMonthStr, 10)
    setSelectedBulan(newMonth)
    const y = selectedTahun || 2026
    const daysInNewMonth = new Date(y, newMonth, 0).getDate()
    const currentDay = selectedDate ? parseInt(selectedDate.split("-")[2], 10) : 1
    const safeDay = Math.min(isNaN(currentDay) || currentDay < 1 ? 1 : currentDay, daysInNewMonth)
    const newDateStr = `${y}-${String(newMonth).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`
    setSelectedDate(newDateStr)
    setLoadedKey("")
    setLoadError("")
    setCurrentPage(1)
    setDispenStudent(null)
  }

  const handleTahunChange = (newYearStr: string | null) => {
    if (!newYearStr) return
    const newYear = parseInt(newYearStr, 10)
    setSelectedTahun(newYear)
    const m = selectedBulan || 1
    const daysInNewMonth = new Date(newYear, m, 0).getDate()
    const currentDay = selectedDate ? parseInt(selectedDate.split("-")[2], 10) : 1
    const safeDay = Math.min(isNaN(currentDay) || currentDay < 1 ? 1 : currentDay, daysInNewMonth)
    const newDateStr = `${newYear}-${String(m).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`
    setSelectedDate(newDateStr)
    setLoadedKey("")
    setLoadError("")
    setCurrentPage(1)
    setDispenStudent(null)
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      const version = ++requestVersion.current
      if (!selectedDate) {
        await Promise.resolve()
        if (active) setSelectedDate(schoolDate())
        return
      }
      try {
        const [dbStudents, attendance] = await Promise.all([
          studentService.getStudentsByClass(kelasCode),
          presensiService.getPresensiByClass(kelasCode, selectedDate),
        ])
        if (!active || version !== requestVersion.current) return
        setStudents(dbStudents.map((student, index) => ({
          noAbs: student.noAbs || index + 1, nisn: student.nisn,
          nama: student.nama, gender: student.gender || "Laki-laki",
          status: getValidAttendanceStatus(attendance[student.nisn]?.status),
          alasanDispen: attendance[student.nisn]?.alasanDispen || "",
        })))
        setLoadedKey(`${kelasCode.toLowerCase()}:${selectedDate}`)
        setLoadError("")
      } catch {
        if (!active || version !== requestVersion.current) return
        setLoadedKey("")
        setLoadError("Presensi gagal dimuat. Periksa koneksi lalu tekan Coba lagi. Data belum dapat diedit atau diekspor.")
      }
    }
    void load()
    const refresh = () => { if (!savingRef.current) void load() }
    window.addEventListener("saguru-data-updated", refresh)
    return () => { active = false; requestVersion.current++; window.removeEventListener("saguru-data-updated", refresh) }
  }, [kelasCode, selectedDate, reload])

  const [searchQuery, setSearchQuery] = useState("")

  // State Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // State Popover Tambah Siswa
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addNama, setAddNama] = useState("")
  const [addNisn, setAddNisn] = useState("")
  const [addGender, setAddGender] = useState("cowok")

  // State Dialog Edit Siswa
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null)
  const [editNama, setEditNama] = useState("")
  const [editNisn, setEditNisn] = useState("")
  const [editGender, setEditGender] = useState("cowok")

  const filteredStudents = students.filter(
    (student) =>
      student.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.nisn.includes(searchQuery)
  )

  // State Dialog Form Dispensasi Siswa
  const [dispenStudent, setDispenStudent] = useState<StudentItem | null>(null)
  const [dispenAlasan, setDispenAlasan] = useState("")

  const handleOpenDispen = (student: StudentItem) => {
    setDispenStudent(student)
    setDispenAlasan(student.alasanDispen || "")
  }

  const syncToLocalStorage = (updated: StudentItem[]) => {
    try {
      const stored = localStorage.getItem("saguru_migrated_students")
      const map = stored ? JSON.parse(stored) : {}
      map[kelasCode.toLowerCase()] = updated
      localStorage.setItem("saguru_migrated_students", JSON.stringify(map))

      const todayDate = getFormattedCurrentDate()
      localStorage.setItem(`saguru_presensi_date_${kelasCode.toLowerCase()}`, todayDate)


      window.dispatchEvent(new Event("saguru-data-updated"))
    } catch (err) { }
  }

  const saveAttendance = async (nisn: string, status: string, reason = "") => {
    if (savingRef.current || !ready) return false
    savingRef.current = true
    setSavingNisn(nisn)
    requestVersion.current++
    try {
      const ok = await presensiService.updateAttendance(nisn, kelasCode, status, reason, selectedDate)
      if (!ok) { alert("Presensi gagal disimpan. Isian tetap tersedia; silakan coba lagi."); return false }
      setStudents(previous => previous.map(student => student.nisn === nisn
        ? { ...student, status, alasanDispen: status === "DISPEN" ? reason : "" } : student))
      return true
    } finally {
      savingRef.current = false
      setSavingNisn(null)
      window.dispatchEvent(new Event("saguru-data-updated"))
    }
  }

  const handleSaveDispen = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!dispenStudent) return
    if (await saveAttendance(dispenStudent.nisn, "DISPEN", dispenAlasan.trim())) {
      setDispenStudent(null)
      setDispenAlasan("")
    }
  }

  const handleSetStatus = (nisn: string, newStatus: string) => saveAttendance(nisn, newStatus)

  // State Dialog Export Data
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [exportType, setExportType] = useState<"bulanan" | "harian">("bulanan")
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf")
  const [exportBulan, setExportBulan] = useState<number>(8)
  const [exportTahunAngka, setExportTahunAngka] = useState<number>(2026)
  const [exportWaliKelas, setExportWaliKelas] = useState("Devy, S.Pd.")
  const [exportKelas, setExportKelas] = useState(`Kelas ${kelasCode.toUpperCase()}`)
  const [exportTahun, setExportTahun] = useState("2026/2027")
  const [exportLoading, setExportLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const handleOpenExport = () => {
    setExportBulan(selectedBulan)
    setExportTahunAngka(selectedTahun)
    setIsExportOpen(true)
  }

  // State Dialog Reset Presensi
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [resetDate, setResetDate] = useState("")
  const [isResetting, setIsResetting] = useState(false)

  const handleOpenReset = () => {
    setResetDate(selectedDate || schoolDate())
    setIsResetOpen(true)
  }

  const handleExecuteReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resetDate || isResetting) return
    setIsResetting(true)
    try {
      let dbDeletedCount = 0

      try {
        const res = await presensiService.resetPresensi(kelasCode, resetDate, false)
        if (res.success) {
          dbDeletedCount = res.count ?? 0
        } else if (res.error) {
          console.warn("Reset Supabase notice:", res.error)
        }
      } catch (dbErr: unknown) {
        console.warn("Reset Supabase notice:", dbErr)
      }

      // Jika tanggal yang direset adalah tanggal yang sedang dilihat, perbarui status tabel seketika
      if (resetDate === selectedDate) {
        setStudents((prev) =>
          prev.map((s) => ({
            ...s,
            status: "BELUM_DICATAT",
            alasanDispen: "",
          }))
        )
      }

      // Jika tanggal yang direset adalah hari ini, sinkronkan juga cache lokal
      if (resetDate === schoolDate()) {
        try {
          const stored = localStorage.getItem("saguru_migrated_students")
          if (stored) {
            const map = JSON.parse(stored)
            const kc = kelasCode.toLowerCase()
            if (map[kc]) {
              map[kc] = map[kc].map((st: StudentItem) => ({
                ...st,
                status: "BELUM_DICATAT",
                alasanDispen: "",
              }))
            }
            localStorage.setItem("saguru_migrated_students", JSON.stringify(map))
          }
        } catch {}
      }

      // Broadcast update event agar Banner & Statistik dashboard ikut tersinkronisasi
      window.dispatchEvent(new Event("saguru-data-updated"))

      if (dbDeletedCount > 0) {
        setToastMessage(`Presensi kelas ${kelasCode.toUpperCase()} tanggal ${resetDate} berhasil direset (${dbDeletedCount} data dibersihkan).`)
      } else {
        setToastMessage(`Presensi kelas ${kelasCode.toUpperCase()} tanggal ${resetDate} berhasil direset.`)
      }
      setTimeout(() => setToastMessage(null), 3000)
      setIsResetOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(`Terjadi kesalahan saat mereset: ${msg}`)
    } finally {
      setIsResetting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * itemsPerPage
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage)

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!addNama.trim() || !addNisn.trim()) return

    const nextNoAbs = students.length > 0 ? Math.max(...students.map((s) => s.noAbs)) + 1 : 1
    const newStudent = {
      noAbs: nextNoAbs,
      nisn: addNisn.trim(),
      nama: addNama.trim(),
      gender: addGender === "cowok" ? "Laki-laki" : "Perempuan",
      status: "HADIR",
    }

    const updated = [...students, newStudent]
    setStudents(updated)
    syncToLocalStorage(updated)
    setAddNama("")
    setAddNisn("")
    setAddGender("cowok")
    setIsAddOpen(false)
  }

  const handleOpenEdit = (student: StudentItem) => {
    setEditingStudent(student)
    setEditNama(student.nama)
    setEditNisn(student.nisn)
    setEditGender(student.gender === "Laki-laki" ? "cowok" : "cewek")
  }

  const handleSaveEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingStudent || !editNama.trim() || !editNisn.trim()) return

    const updated = students.map((s) =>
      s.nisn === editingStudent.nisn
        ? {
          ...s,
          nisn: editNisn.trim(),
          nama: editNama.trim(),
          gender: editGender === "cowok" ? "Laki-laki" : "Perempuan",
        }
        : s
    )
    setStudents(updated)
    syncToLocalStorage(updated)
    setEditingStudent(null)
  }

  const handleExportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (savingRef.current) return
    const formatLabel = exportFormat === "pdf" ? "PDF" : "Excel (.xlsx)"
    setExportLoading(true)

    try {
      if (exportType === "bulanan") {
        const bulanName = NAMA_BULAN_INDONESIA[exportBulan - 1]
        setToastMessage(`Mengunduh Rekap Presensi Bulan ${bulanName} ${exportTahunAngka} (${formatLabel})...`)

        // 1. Ambil data presensi bulan tersebut dari Supabase
        const monthlyData = await presensiService.getMonthlyPresensiByClass(kelasCode, exportTahunAngka, exportBulan)

        // 2. Ambil data siswa terkini (prioritaskan state students, fallback ke service)
        let currentStudents = students
        if (currentStudents.length === 0) {
          const dbStudents = await studentService.getStudentsByClass(kelasCode)
          currentStudents = dbStudents.map((s, idx) => ({
            noAbs: s.noAbs || idx + 1,
            nisn: s.nisn,
            nama: s.nama,
            gender: s.gender || "Laki-laki",
          }))
        }

        const daysInMonth = new Date(exportTahunAngka, exportBulan, 0).getDate()
        const monthlyStudents = buildStudentMonthlyAttendance(currentStudents, monthlyData, daysInMonth)

        const exportOptions = {
          students: monthlyStudents,
          kelas: exportKelas,
          bulan: exportBulan,
          tahun: exportTahunAngka,
          waliKelas: exportWaliKelas,
          tahunAjaran: exportTahun,
        }

        if (exportFormat === "excel") {
          await exportMonthlyPresensiToExcel(exportOptions)
        } else {
          exportMonthlyPresensiToPDF(exportOptions)
        }
      } else {
        setToastMessage(`Mengunduh file ${formatLabel} untuk ${exportKelas}...`)
        const currentExportTime = getFormattedCurrentDateTime()
        if (exportFormat === "excel") {
          await exportToExcel({
            students,
            kelas: exportKelas,
            tahun: exportTahun,
            waliKelas: exportWaliKelas,
            tanggal: exportTanggal,
            tanggalExport: currentExportTime,
          })
        } else {
          exportToPDF({
            students,
            kelas: exportKelas,
            tahun: exportTahun,
            waliKelas: exportWaliKelas,
            tanggal: exportTanggal,
            tanggalExport: currentExportTime,
          })
        }
      }
    } catch (err) {
      console.error("Export error:", err)
      setToastMessage("Gagal mengunduh berkas presensi.")
    } finally {
      setExportLoading(false)
      setIsExportOpen(false)
      setTimeout(() => {
        setToastMessage(null)
      }, 4000)
    }
  }

  return (
    <div className="space-y-4">
      {/* Kontrol Pilihan Bulan, Tahun, dan Tanggal Presensi */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="presensi-bulan" className="text-xs font-semibold text-foreground">Bulan:</label>
          <Select value={String(selectedBulan)} onValueChange={handleBulanChange} disabled={Boolean(savingNisn)}>
            <SelectTrigger id="presensi-bulan" className="h-9 w-32 text-xs">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              {NAMA_BULAN_INDONESIA.map((name, idx) => (
                <SelectItem key={idx + 1} value={String(idx + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="presensi-tahun" className="text-xs font-semibold text-foreground">Tahun:</label>
          <Select value={String(selectedTahun)} onValueChange={handleTahunChange} disabled={Boolean(savingNisn)}>
            <SelectTrigger id="presensi-tahun" className="h-9 w-24 text-xs">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
              <SelectItem value="2028">2028</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="presensi-date" className="text-xs font-semibold text-foreground">Tanggal presensi:</label>
          <Input id="presensi-date" type="date" className="w-auto h-9 text-xs" value={selectedDate}
            disabled={Boolean(savingNisn)} onChange={event => {
              if (!event.target.value || savingRef.current) return
              requestVersion.current++
              setSelectedDate(event.target.value); setLoadedKey(""); setLoadError(""); setCurrentPage(1)
              setDispenStudent(null)
            }} />
        </div>

        {savingNisn && <span role="status" className="text-xs text-muted-foreground animate-pulse">Menyimpan presensi...</span>}
      </div>
      {loadError && <div role="alert" className="text-sm text-destructive">{loadError} <Button variant="outline" onClick={() => setReload(value => value + 1)}>Coba lagi</Button></div>}
      {!ready && !loadError && <p role="status">Memuat presensi tanggal terpilih...</p>}
      {ready && <p className="text-sm text-muted-foreground">{students.filter(s => s.status === "BELUM_DICATAT").length} siswa belum dicatat. Pilih status untuk menyimpan presensi.</p>}

      {/* Fitur Search & Export Data */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Kiri: Search Input */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Cari nama atau NISN..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9 h-9 text-xs sm:text-sm bg-background border-border w-full"
          />
        </div>

        {/* Reset Presensi & Export */}
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="outline"
            className="h-9 px-3 text-xs sm:text-sm gap-2 cursor-pointer border-border hover:bg-muted text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:border-rose-500/50"
            disabled={!ready || Boolean(savingNisn) || isResetting}
            onClick={handleOpenReset}
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset Presensi</span>
          </Button>
          <Button
            variant="outline"
            className="h-9 px-3 text-xs sm:text-sm gap-2 cursor-pointer border-border hover:bg-accent"
            disabled={!ready || Boolean(savingNisn)}
            onClick={handleOpenExport}
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      <Table>
        <Table.ScrollContainer className="table-scroll-area max-h-[420px] sm:max-h-[480px] overflow-y-auto relative overscroll-contain rounded-lg border border-border/60">
          <Table.Content aria-label={`Data Presensi Siswa Kelas ${kelasCode.toUpperCase()}`} className="min-w-[760px]">
            <Table.Header className="sticky top-0 z-10 bg-card shadow-2xs">

              <Table.Column className="text-foreground font-semibold bg-card sticky top-0 z-10">No Abs</Table.Column>
              <Table.Column className="text-foreground font-semibold bg-card sticky top-0 z-10">NISN</Table.Column>
              <Table.Column isRowHeader className="text-foreground font-semibold bg-card sticky top-0 z-10">Nama</Table.Column>
              <Table.Column className="text-foreground font-semibold bg-card sticky top-0 z-10">L/P</Table.Column>
              <Table.Column className="text-foreground font-semibold text-center bg-card sticky top-0 z-10">Status Presensi</Table.Column>
            </Table.Header>
            <Table.Body>
              {!ready || paginatedStudents.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={5} className="text-center py-6 text-muted-foreground">
                    {!ready ? "Data presensi belum tersedia." : searchQuery ? `Tidak ada siswa yang cocok dengan pencarian "${searchQuery}".` : "Belum ada siswa di kelas ini."}
                  </Table.Cell>
                </Table.Row>
              ) : (
                paginatedStudents.map((student) => {
                  const currentStatus = getValidAttendanceStatus(student.status)
                  return (
                    <Table.Row key={student.nisn}>

                      <Table.Cell>{student.noAbs}</Table.Cell>
                      <Table.Cell className="font-mono">{student.nisn}</Table.Cell>
                      <Table.Cell>
                        <span className="font-medium text-foreground block">{student.nama}</span>
                        {currentStatus === "DISPEN" && student.alasanDispen && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium italic block mt-0.5">
                            Alasan Dispen: {student.alasanDispen}
                          </span>
                        )}
                      </Table.Cell>
                      <Table.Cell>{student.gender}</Table.Cell>
                      <Table.Cell>
                        {currentStatus === "BELUM_DICATAT" && <p className="text-xs text-center mb-2 text-muted-foreground">Belum dicatat</p>}
                        <fieldset disabled={!ready || Boolean(savingNisn)} className="flex items-center justify-center gap-1.5" aria-label={`Status presensi ${student.nama}`}>
                          {/* HADIR = Hijau */}
                          <button
                            type="button"
                            className={cn(
                              "btn btn-sm btn-success text-[11px] font-semibold tracking-wide py-1 px-2.5 rounded-lg transition-all cursor-pointer",
                              currentStatus === "HADIR"
                                ? "btn-active ring-2 ring-emerald-500/50 shadow-sm opacity-100 scale-105"
                                : "opacity-35 hover:opacity-100"
                            )}
                            onClick={() => handleSetStatus(student.nisn, "HADIR")}
                          >
                            Hadir
                          </button>

                          {/* DISPEN = Kuning */}
                          <button
                            type="button"
                            className={cn(
                              "btn btn-sm btn-warning text-[11px] font-semibold tracking-wide py-1 px-2.5 rounded-lg transition-all cursor-pointer",
                              currentStatus === "DISPEN"
                                ? "btn-active ring-2 ring-amber-500/50 shadow-sm opacity-100 scale-105"
                                : "opacity-35 hover:opacity-100"
                            )}
                            onClick={() => handleOpenDispen(student)}
                          >
                            DISPEN
                          </button>

                          {/* SAKIT = Merah */}
                          <button
                            type="button"
                            className={cn(
                              "btn btn-sm btn-error text-[11px] font-semibold tracking-wide py-1 px-2.5 rounded-lg transition-all cursor-pointer",
                              currentStatus === "SAKIT"
                                ? "btn-active ring-2 ring-rose-500/50 shadow-sm opacity-100 scale-105"
                                : "opacity-35 hover:opacity-100"
                            )}
                            onClick={() => handleSetStatus(student.nisn, "SAKIT")}
                          >
                            SAKIT
                          </button>

                          {/* ALPHA = Biru */}
                          <button
                            type="button"
                            className={cn(
                              "btn btn-sm btn-info text-[11px] font-semibold tracking-wide py-1 px-2.5 rounded-lg transition-all cursor-pointer",
                              currentStatus === "ALPHA"
                                ? "btn-active ring-2 ring-sky-500/50 shadow-sm opacity-100 scale-105"
                                : "opacity-35 hover:opacity-100"
                            )}
                            onClick={() => handleSetStatus(student.nisn, "ALPHA")}
                          >
                            ALPHA
                          </button>
                        </fieldset>
                      </Table.Cell>
                    </Table.Row>
                  )
                })
              )}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
        <div>
          Menampilkan {filteredStudents.length === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredStudents.length)} dari {filteredStudents.length} siswa
        </div>
        <Pagination className="justify-center sm:justify-end mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (safeCurrentPage > 1) setCurrentPage(safeCurrentPage - 1)
                }}
                className={safeCurrentPage <= 1 ? "pointer-events-none opacity-50 cursor-not-allowed" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  isActive={page === safeCurrentPage}
                  onClick={(e) => {
                    e.preventDefault()
                    setCurrentPage(page)
                  }}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (safeCurrentPage < totalPages) setCurrentPage(safeCurrentPage + 1)
                }}
                className={safeCurrentPage >= totalPages ? "pointer-events-none opacity-50 cursor-not-allowed" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Dialog Export Data Siswa */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleExportSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <Download className="h-5 w-5 text-[#4274D9]" />
                <span>Export Rekap Presensi Siswa</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Pilih format dokumen, periode bulan/tahun, dan atur metadata sebelum mengunduh rekap.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              {/* Pilihan Mode Dokumen (Bulanan Landscape vs Harian) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Jenis Rekap Presensi</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={cn(
                      "flex flex-col items-start p-2.5 rounded-lg border text-left cursor-pointer transition-all",
                      exportType === "bulanan"
                        ? "border-[#4274D9] bg-[#4274D9]/10 text-foreground font-medium"
                        : "border-border hover:bg-accent/50 text-muted-foreground"
                    )}
                    onClick={() => setExportType("bulanan")}
                  >
                    <span className="text-xs font-semibold">Rekap 1 Bulan</span>
                    <span className="text-[10px] text-muted-foreground">1 lembar landscape A4</span>
                  </button>

                  <button
                    type="button"
                    className={cn(
                      "flex flex-col items-start p-2.5 rounded-lg border text-left cursor-pointer transition-all",
                      exportType === "harian"
                        ? "border-[#4274D9] bg-[#4274D9]/10 text-foreground font-medium"
                        : "border-border hover:bg-accent/50 text-muted-foreground"
                    )}
                    onClick={() => setExportType("harian")}
                  >
                    <span className="text-xs font-semibold">Presensi Harian</span>
                    <span className="text-[10px] text-muted-foreground">Tanggal terpilih ({exportTanggal})</span>
                  </button>
                </div>
              </div>

              {/* Tahap 1: Opsi Format Export */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Format Berkas</Label>
                <RadioGroup value={exportFormat} onValueChange={(val) => setExportFormat(val as "pdf" | "excel")} className="grid grid-cols-2 gap-3 mt-1">
                  <div
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all",
                      exportFormat === "pdf"
                        ? "border-[#4274D9] bg-[#4274D9]/10 text-foreground font-medium"
                        : "border-border hover:bg-accent/50 text-muted-foreground"
                    )}
                    onClick={() => setExportFormat("pdf")}
                  >
                    <RadioGroupItem value="pdf" id="export-pdf-heroui" />
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-red-500 shrink-0" />
                      <Label htmlFor="export-pdf-heroui" className="text-xs font-medium cursor-pointer">
                        PDF (.pdf)
                      </Label>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all",
                      exportFormat === "excel"
                        ? "border-[#4274D9] bg-[#4274D9]/10 text-foreground font-medium"
                        : "border-border hover:bg-accent/50 text-muted-foreground"
                    )}
                    onClick={() => setExportFormat("excel")}
                  >
                    <RadioGroupItem value="excel" id="export-excel-heroui" />
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                      <Label htmlFor="export-excel-heroui" className="text-xs font-medium cursor-pointer">
                        Excel (.xlsx)
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Tahap 2: Pengaturan Metadata Dokumen */}
              <FieldGroup className="space-y-3">
                {exportType === "bulanan" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <Label className="text-xs font-semibold">Pilihan Bulan</Label>
                      <Select value={String(exportBulan)} onValueChange={(val) => val && setExportBulan(parseInt(val, 10))}>
                        <SelectTrigger className="w-full h-9 text-xs">
                          <SelectValue placeholder="Pilih Bulan" />
                        </SelectTrigger>
                        <SelectContent>
                          {NAMA_BULAN_INDONESIA.map((name, idx) => (
                            <SelectItem key={idx + 1} value={String(idx + 1)}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <Label className="text-xs font-semibold">Pilihan Tahun</Label>
                      <Select value={String(exportTahunAngka)} onValueChange={(val) => val && setExportTahunAngka(parseInt(val, 10))}>
                        <SelectTrigger className="w-full h-9 text-xs">
                          <SelectValue placeholder="Pilih Tahun" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                          <SelectItem value="2026">2026</SelectItem>
                          <SelectItem value="2027">2027</SelectItem>
                          <SelectItem value="2028">2028</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                ) : (
                  <Field>
                    <Label htmlFor="export-heroui-tanggal" className="text-xs font-semibold">Tanggal Presensi</Label>
                    <Input
                      id="export-heroui-tanggal"
                      name="tanggal"
                      value={exportTanggal}
                      readOnly
                      placeholder="13 Agustus 2026"
                      className="h-9 text-xs bg-muted"
                      required
                    />
                  </Field>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <Label htmlFor="export-heroui-wali-kelas" className="text-xs font-semibold">Wali Kelas</Label>
                    <Input
                      id="export-heroui-wali-kelas"
                      name="waliKelas"
                      value={exportWaliKelas}
                      onChange={(e) => setExportWaliKelas(e.target.value)}
                      placeholder="Devy, S.Pd."
                      className="h-9 text-xs"
                      required
                    />
                  </Field>

                  <Field>
                    <Label className="text-xs font-semibold">Kelas Binaan</Label>
                    <Select value={exportKelas} onValueChange={(val) => val && setExportKelas(val)}>
                      <SelectTrigger className="w-full h-9 text-xs">
                        <SelectValue placeholder="Pilih Kelas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kelas 9A">Kelas 9A</SelectItem>
                        <SelectItem value="Kelas 9B">Kelas 9B</SelectItem>
                        <SelectItem value="Kelas 9C">Kelas 9C</SelectItem>
                        <SelectItem value="Kelas 9D">Kelas 9D</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field>
                  <Label className="text-xs font-semibold">Tahun Ajaran</Label>
                  <Select value={exportTahun} onValueChange={(val) => val && setExportTahun(val)}>
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue placeholder="Pilih Tahun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025/2026">2025/2026</SelectItem>
                      <SelectItem value="2026/2027">2026/2027</SelectItem>
                      <SelectItem value="2027/2028">2027/2028</SelectItem>
                      <SelectItem value="2028/2029">2028/2029</SelectItem>
                      <SelectItem value="2029/2030">2029/2030</SelectItem>
                      <SelectItem value="2030/2031">2030/2031</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              {/* Tahap 3: Area Preview Ringkas */}
              <div className="rounded-lg border border-border/80 bg-muted/60 p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="font-semibold text-foreground">
                    {exportType === "bulanan" ? "Format Rekap Bulanan" : "Format Presensi Harian"}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-bold uppercase">
                    {exportFormat === "pdf" ? "PDF (Landscape)" : "Excel (.xlsx)"}
                  </span>
                </div>

                {exportType === "bulanan" ? (
                  <div className="bg-background/90 rounded border border-border/60 p-3 font-sans text-xs space-y-2 shadow-2xs">
                    <div className="text-center font-bold text-foreground tracking-wide font-mono">
                      REKAPITULASI PRESENSI BULANAN SISWA
                    </div>
                    <div className="text-center text-[11px] text-muted-foreground">
                      BULAN: <strong className="text-foreground">{NAMA_BULAN_INDONESIA[exportBulan - 1].toUpperCase()} {exportTahunAngka}</strong> | {exportTahun}
                    </div>
                    <div className="p-2 rounded bg-muted/50 border border-border/40 text-[11px] space-y-1 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Tata letak:</span>
                        <span className="font-medium text-foreground">1 Lembar Landscape A4</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cakupan tanggal:</span>
                        <span className="font-medium text-foreground">1 s/d {new Date(exportTahunAngka, exportBulan, 0).getDate()} {NAMA_BULAN_INDONESIA[exportBulan - 1]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Data belum dicatat:</span>
                        <span className="font-medium text-foreground">Tetap tertulis &quot;–&quot;</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ringkasan kehadiran:</span>
                        <span className="font-medium text-foreground">H, S, I, A, D, dan % Kehadiran</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-background/90 rounded border border-border/60 p-3 font-mono text-[11px] space-y-1.5 shadow-2xs">
                    <div className="text-center font-bold text-foreground tracking-wide">
                      DAFTAR PRESENSI SISWA
                    </div>
                    <div className="text-center font-bold text-foreground">
                      TAHUN PELAJARAN {exportTahun}
                    </div>
                    <div className="flex justify-between items-end pt-2 text-[10px] text-muted-foreground border-t border-border/40 font-sans">
                      <div>
                        <div>TANGGAL: {exportTanggal}</div>
                        <div className="italic">MATA PELAJARAN: Presensi Harian</div>
                      </div>
                      <div className="text-right font-medium text-foreground leading-tight">
                        <div>KELAS : {exportKelas}</div>
                        <div>Wali Kelas : {exportWaliKelas || "-"}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="mt-2">
              <DialogClose render={<Button variant="outline" size="sm" type="button" className="h-8 text-xs px-3">Batal</Button>} />
              <Button
                type="submit"
                size="sm"
                disabled={exportLoading}
                className="h-8 text-xs px-3 gap-1.5 bg-[#4274D9] hover:bg-[#3561bd] text-white cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{exportLoading ? "Mengunduh..." : "Unduh Dokumen"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Data Siswa */}
      <Dialog open={editingStudent !== null} onOpenChange={(open) => { if (!open) setEditingStudent(null) }}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle>Edit data siswa</DialogTitle>
              <DialogDescription>
                Masukkan data yang ingin diubah
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-2 space-y-3">
              <Field>
                <Label htmlFor="edit-heroui-name">Nama</Label>
                <Input
                  id="edit-heroui-name"
                  name="name"
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="edit-heroui-nisn">NISN</Label>
                <Input
                  id="edit-heroui-nisn"
                  name="nisn"
                  value={editNisn}
                  onChange={(e) => setEditNisn(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <Label className="text-sm font-medium text-foreground">L/P</Label>
                <RadioGroup
                  value={editGender}
                  onValueChange={setEditGender}
                  className="flex items-center gap-6 mt-1"
                >
                  <div className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="cowok" id="edit-heroui-r-cowok" />
                    <Label htmlFor="edit-heroui-r-cowok" className="text-sm font-medium cursor-pointer">
                      Cowok
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="cewek" id="edit-heroui-r-cewek" />
                    <Label htmlFor="edit-heroui-r-cewek" className="text-sm font-medium cursor-pointer">
                      Cewek
                    </Label>
                  </div>
                </RadioGroup>
              </Field>
            </FieldGroup>
            <DialogFooter className="mt-4">
              <DialogClose render={<Button variant="outline" type="button">Batal</Button>} />
              <Button type="submit" className="bg-[#4274D9] hover:bg-[#3561bd] text-white cursor-pointer">
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Form Dispensasi Siswa */}
      <Dialog open={dispenStudent !== null} onOpenChange={(open) => { if (!open && !savingRef.current) setDispenStudent(null) }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveDispen} className="space-y-4"><fieldset disabled={Boolean(savingNisn) || !ready} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <span className="h-3 w-3 rounded-full bg-amber-500 inline-block" />
                <span>Form Dispensasi Siswa</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Masukkan alasan dispensasi untuk <strong className="text-foreground">{dispenStudent?.nama}</strong> (NISN: {dispenStudent?.nisn}).
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="py-1 space-y-3">
              <Field>
                <Label htmlFor="dispen-alasan-input-heroui" className="text-xs font-semibold">Alasan Dispensasi</Label>
                <Input
                  id="dispen-alasan-input-heroui"
                  name="alasan"
                  value={dispenAlasan}
                  onChange={(e) => setDispenAlasan(e.target.value)}
                  placeholder="Contoh: Lomba Paskibra Kabupaten, Tugas PMR, dll..."
                  className="h-9 text-xs"
                  required
                  autoFocus
                />
              </Field>
            </FieldGroup>

            <DialogFooter className="pt-2">
              <DialogClose render={<Button variant="outline" size="sm" type="button" className="h-8 text-xs">Batal</Button>} />
              <Button type="submit" size="sm" className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white cursor-pointer font-medium">
                Simpan Dispensasi
              </Button>
            </DialogFooter>
          </fieldset></form>
        </DialogContent>
      </Dialog>

      {/* Dialog Reset Presensi Sederhana */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleExecuteReset} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <RotateCcw className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <span>Reset Presensi</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Pilih tanggal presensi yang ingin direset ke status Belum Dicatat.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="py-1">
              <Field>
                <FieldLabel htmlFor="reset-presensi-date" className="text-xs font-medium text-foreground">
                  Tanggal
                </FieldLabel>
                <Input
                  id="reset-presensi-date"
                  type="date"
                  value={resetDate}
                  onChange={(e) => setResetDate(e.target.value)}
                  max={schoolDate()}
                  className="h-9 text-xs"
                  required
                />
              </Field>
            </FieldGroup>

            <DialogFooter className="pt-2">
              <DialogClose
                render={
                  <Button variant="outline" size="sm" type="button" disabled={isResetting} className="h-8 text-xs">
                    Batal
                  </Button>
                }
              />
              <Button
                type="submit"
                size="sm"
                disabled={isResetting || !resetDate}
                className="h-8 text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer font-medium"
              >
                {isResetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                <span>{isResetting ? "Mereset..." : "Reset Presensi"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Notifikasi Berhasil di Tengah Layar */}
      {toastMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none animate-in fade-in duration-200">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-card/95 backdrop-blur-md px-6 py-4 text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 animate-in zoom-in-95 duration-200 max-w-md text-center">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="leading-snug">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HeroUITableAnatomy() {
  return (
    <Table>
      <Table.ScrollContainer className="table-scroll-area max-h-[420px] sm:max-h-[480px] overflow-y-auto relative overscroll-contain rounded-lg border border-border/60">
        <Table.Content aria-label="Example table">
          <Table.Header className="sticky top-0 z-10 bg-card shadow-2xs">
            <Table.Column className="text-foreground font-semibold bg-card sticky top-0 z-10">No Abs</Table.Column>
            <Table.Column className="text-foreground font-semibold bg-card sticky top-0 z-10">NISN</Table.Column>
            <Table.Column isRowHeader className="text-foreground font-semibold bg-card sticky top-0 z-10">Nama</Table.Column>
            <Table.Column className="text-foreground font-semibold bg-card sticky top-0 z-10">L/P</Table.Column>
            <Table.Column className="text-foreground font-semibold text-center bg-card sticky top-0 z-10">Aksi</Table.Column>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell>1</Table.Cell>
              <Table.Cell className="font-mono">0081234561</Table.Cell>
              <Table.Cell className="font-medium">Ahmad Fauzi</Table.Cell>
              <Table.Cell>Laki-laki</Table.Cell>
              <Table.Cell>
                <div className="flex items-center justify-center gap-1.5">
                  <Dialog>
                    <DialogTrigger
                      render={
                        <button className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer" title="Edit">
                          <Edit3 className="h-4 w-4" />
                        </button>
                      }
                    />
                    <DialogContent className="sm:max-w-sm">
                      <form onSubmit={(e) => e.preventDefault()}>
                        <DialogHeader>
                          <DialogTitle>Edit data siswa</DialogTitle>
                          <DialogDescription>
                            Masukkan data yang ingin diubah
                          </DialogDescription>
                        </DialogHeader>
                        <FieldGroup className="py-2 space-y-3">
                          <Field>
                            <Label htmlFor="name-default">Nama</Label>
                            <Input id="name-default" name="name" defaultValue="Ahmad Fauzi" />
                          </Field>
                          <Field>
                            <Label htmlFor="nisn-default">NISN</Label>
                            <Input id="nisn-default" name="nisn" defaultValue="0081234561" />
                          </Field>
                          <Field>
                            <Label className="text-sm font-medium text-foreground">L/P</Label>
                            <RadioGroup defaultValue="cowok" className="flex items-center gap-6 mt-1">
                              <div className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="cowok" id="r-cowok-anat" />
                                <Label htmlFor="r-cowok-anat" className="text-sm font-medium cursor-pointer">Cowok</Label>
                              </div>
                              <div className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="cewek" id="r-cewek-anat" />
                                <Label htmlFor="r-cewek-anat" className="text-sm font-medium cursor-pointer">Cewek</Label>
                              </div>
                            </RadioGroup>
                          </Field>
                        </FieldGroup>
                        <DialogFooter className="mt-4">
                          <DialogClose render={<Button variant="outline">Batal</Button>} />
                          <Button type="submit" className="bg-[#4274D9] hover:bg-[#3561bd] text-white">Save changes</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                </div>
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
      <Table.Footer>{/* Optional footer content */}</Table.Footer>
    </Table>
  );
}
