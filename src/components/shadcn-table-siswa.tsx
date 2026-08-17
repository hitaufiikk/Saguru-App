"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Edit3, Trash2, Search, UserPlus, Download, FileText, FileSpreadsheet, Users, UserX } from "lucide-react"
import { cn } from "@/lib/utils"
import { Table } from "@heroui/react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { BinaanClassDropdown } from "@/components/binaan-class-dropdown"
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
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
} from "@/components/ui/popover"
import { Field, FieldGroup } from "@/components/ui/field"
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
  exportToExcel,
  exportToPDF,
  getFormattedCurrentDate,
  getFormattedCurrentDateTime,
} from "@/lib/export-utils"
import { studentService } from "@/lib/services/studentService"

export interface StudentItem {
  noAbs: number
  nisn: string
  nama: string
  gender: string
  kontakOrtu?: string
}

const DEFAULT_9A_STUDENTS: StudentItem[] = [
  { noAbs: 1, nisn: "0081234561", nama: "Ahmad Fauzi", gender: "Laki-laki", kontakOrtu: "-" },
  { noAbs: 2, nisn: "0081234562", nama: "Aisha Rahma", gender: "Perempuan", kontakOrtu: "-" },
  { noAbs: 3, nisn: "0081234563", nama: "Budi Santoso", gender: "Laki-laki", kontakOrtu: "-" },
  { noAbs: 4, nisn: "0081234564", nama: "Cantika Putri", gender: "Perempuan", kontakOrtu: "-" },
  { noAbs: 5, nisn: "0081234565", nama: "Deni Kurniawan", gender: "Laki-laki", kontakOrtu: "-" },
  { noAbs: 6, nisn: "0081234566", nama: "Dewi Lestari", gender: "Perempuan", kontakOrtu: "-" },
  { noAbs: 7, nisn: "0081234567", nama: "Eko Prasetyo", gender: "Laki-laki", kontakOrtu: "-" },
  { noAbs: 8, nisn: "0081234568", nama: "Fitri Handayani", gender: "Perempuan", kontakOrtu: "-" },
  { noAbs: 9, nisn: "0081234569", nama: "Gilang Ramadhan", gender: "Laki-laki", kontakOrtu: "-" },
  { noAbs: 10, nisn: "0081234570", nama: "Hania Nabila", gender: "Perempuan", kontakOrtu: "-" },
  { noAbs: 11, nisn: "0081234571", nama: "Indra Wijaya", gender: "Laki-laki", kontakOrtu: "-" },
  { noAbs: 12, nisn: "0081234572", nama: "Jasmine Kartika", gender: "Perempuan", kontakOrtu: "-" },
  { noAbs: 13, nisn: "0081234573", nama: "Kevin Pratama", gender: "Laki-laki", kontakOrtu: "-" },
  { noAbs: 14, nisn: "0081234574", nama: "Larasati Anggraini", gender: "Perempuan", kontakOrtu: "-" },
  { noAbs: 15, nisn: "0081234575", nama: "Muhammad Rizky", gender: "Laki-laki", kontakOrtu: "-" },
]

export function ShadcnTableSiswa({ kelasCode = "9a" }: { kelasCode?: string } = {}) {
  const router = useRouter()
  const [students, setStudents] = useState<StudentItem[]>([])

  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Popover Tambah State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addNama, setAddNama] = useState("")
  const [addNisn, setAddNisn] = useState("")
  const [addGender, setAddGender] = useState("cowok")
  const [addKontak, setAddKontak] = useState("")

  // Dialog Edit State
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null)
  const [editNama, setEditNama] = useState("")
  const [editNisn, setEditNisn] = useState("")
  const [editGender, setEditGender] = useState("cowok")
  const [editKontak, setEditKontak] = useState("")

  // Dialog Delete State
  const [deletingStudent, setDeletingStudent] = useState<StudentItem | null>(null)

  // Persistent Multi-select Key
  const storageKey = `saguru_selected_siswa_${kelasCode.toLowerCase()}`

  // Multi-select & Bulk Delete State
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedNisns, setSelectedNisns] = useState<string[]>([])
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Sync students from localStorage & Supabase on mount and kelasCode change
  useEffect(() => {
    setIsMounted(true)
    let isMountedFlag = true

    // 1. First load from LocalStorage for instant SSR-safe render
    try {
      const stored = localStorage.getItem("saguru_migrated_students")
      if (stored) {
        const map = JSON.parse(stored)
        if (map[kelasCode?.toLowerCase()] && Array.isArray(map[kelasCode?.toLowerCase()])) {
          setStudents(map[kelasCode?.toLowerCase()])
        }
      }
    } catch (err) {}

    // 2. Fetch latest from Supabase
    async function loadFromSupabase() {
      const data = await studentService.getStudentsByClass(kelasCode)
      if (isMountedFlag && data.length > 0) {
        setStudents(
          data.map((s, idx) => ({
            noAbs: s.noAbs || (idx + 1),
            nisn: s.nisn,
            nama: s.nama,
            gender: s.gender,
            kontakOrtu: s.kontak_ortu || "-",
          }))
        )
      }
    }
    loadFromSupabase()
    return () => {
      isMountedFlag = false
    }
  }, [kelasCode])

  // Load selection when kelasCode changes
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          setSelectedNisns(JSON.parse(stored))
        } else {
          setSelectedNisns([])
        }
      } catch (err) {
        setSelectedNisns([])
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [kelasCode, storageKey])

  const saveSelectedNisns = (newSelected: string[]) => {
    setSelectedNisns(newSelected)
    try {
      localStorage.setItem(storageKey, JSON.stringify(newSelected))
    } catch (err) {}
  }

  const filteredStudents = students.filter(
    (student) =>
      student.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.nisn.includes(searchQuery)
  )

  const isAllSelected = filteredStudents.length > 0 && filteredStudents.every((s) => selectedNisns.includes(s.nisn))

  const handleToggleHeaderCheckbox = () => {
    if (isAllSelected) {
      saveSelectedNisns([])
    } else {
      saveSelectedNisns(filteredStudents.map((s) => s.nisn))
    }
  }

  const handleToggleSelect = (nisn: string) => {
    const next = selectedNisns.includes(nisn)
      ? selectedNisns.filter((id) => id !== nisn)
      : [...selectedNisns, nisn]
    saveSelectedNisns(next)
  }

  const handleExecuteBulkDelete = () => {
    const updated = students.filter((s) => !selectedNisns.includes(s.nisn))
    setStudents(updated)

    try {
      const stored = localStorage.getItem("saguru_migrated_students")
      const map = stored ? JSON.parse(stored) : {}
      map[kelasCode.toLowerCase()] = updated
      localStorage.setItem("saguru_migrated_students", JSON.stringify(map))
      localStorage.removeItem(storageKey)
      window.dispatchEvent(new Event("saguru-data-updated"))
    } catch (err) {}

    // Sync deletes to Supabase
    selectedNisns.forEach((id) => studentService.deleteStudent(id))

    saveSelectedNisns([])
    setIsBulkDeleteOpen(false)
    setIsSelectionMode(false)
  }

  // Export State
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf")
  const [exportWaliKelas, setExportWaliKelas] = useState("Devy, S.Pd.")
  const [exportKelas, setExportKelas] = useState(`Kelas ${kelasCode.toUpperCase()}`)
  const [exportTahun, setExportTahun] = useState("2026/2027")
  const [exportTanggal, setExportTanggal] = useState<string>("")

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const storedDate = localStorage.getItem(`saguru_presensi_date_${kelasCode.toLowerCase()}`)
        setExportTanggal(storedDate || getFormattedCurrentDate())
      } catch (err) {
        setExportTanggal(getFormattedCurrentDate())
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [kelasCode])
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * itemsPerPage
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage)

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!addNama.trim() || !addNisn.trim()) return

    const nextNoAbs = students.length > 0 ? Math.max(...students.map((s) => s.noAbs)) + 1 : 1
    const newStudent: StudentItem = {
      noAbs: nextNoAbs,
      nisn: addNisn.trim(),
      nama: addNama.trim(),
      gender: addGender === "cowok" ? "Laki-laki" : "Perempuan",
      kontakOrtu: addKontak.trim() ? addKontak.trim() : "-",
    }

    const updated = [...students, newStudent]
    setStudents(updated)

    try {
      const stored = localStorage.getItem("saguru_migrated_students")
      const map = stored ? JSON.parse(stored) : {}
      map[kelasCode.toLowerCase()] = updated
      localStorage.setItem("saguru_migrated_students", JSON.stringify(map))
      window.dispatchEvent(new Event("saguru-data-updated"))
    } catch (err) {}

    // Sync to Supabase
    studentService.addStudent({
      nisn: newStudent.nisn,
      nama: newStudent.nama,
      gender: newStudent.gender,
      kelas_code: kelasCode,
    })

    setAddNama("")
    setAddNisn("")
    setAddGender("cowok")
    setAddKontak("")
    setIsAddOpen(false)
  }

  const handleOpenEdit = (student: StudentItem) => {
    setEditingStudent(student)
    setEditNama(student.nama)
    setEditNisn(student.nisn)
    setEditGender(student.gender === "Laki-laki" ? "cowok" : "cewek")
    setEditKontak(student.kontakOrtu || "-")
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
            kontakOrtu: editKontak.trim() ? editKontak.trim() : "-",
          }
        : s
    )
    setStudents(updated)

    try {
      const stored = localStorage.getItem("saguru_migrated_students")
      const map = stored ? JSON.parse(stored) : {}
      map[kelasCode.toLowerCase()] = updated
      localStorage.setItem("saguru_migrated_students", JSON.stringify(map))
      window.dispatchEvent(new Event("saguru-data-updated"))
    } catch (err) {}

    // Sync to Supabase
    studentService.updateStudent(editingStudent.nisn, {
      nisn: editNisn.trim(),
      nama: editNama.trim(),
      gender: editGender === "cowok" ? "Laki-laki" : "Perempuan",
    })

    setEditingStudent(null)
  }

  const handleConfirmDelete = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!deletingStudent) return

    const updated = students.filter((s) => s.nisn !== deletingStudent.nisn)
    setStudents(updated)

    try {
      const stored = localStorage.getItem("saguru_migrated_students")
      const map = stored ? JSON.parse(stored) : {}
      map[kelasCode.toLowerCase()] = updated
      localStorage.setItem("saguru_migrated_students", JSON.stringify(map))
      window.dispatchEvent(new Event("saguru-data-updated"))
    } catch (err) {}

    // Sync delete to Supabase
    studentService.deleteStudent(deletingStudent.nisn)

    setDeletingStudent(null)
  }

  const handleExportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formatLabel = exportFormat === "pdf" ? "PDF" : "Excel (.xlsx)"
    setToastMessage(`Mengunduh file ${formatLabel} untuk ${exportKelas}...`)

    const currentExportTime = getFormattedCurrentDateTime()

    try {
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
    } catch (err) {
      console.error("Export error:", err)
    }

    setIsExportOpen(false)
    setTimeout(() => setToastMessage(null), 4000)
  }

  return (
    <div className="space-y-4">
      {/* Action Bar: Search & Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-72 md:w-80">
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

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end shrink-0">
          {/* Popover Tambah Siswa */}
          <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
            <PopoverTrigger render={
              <Button size="sm" className="h-9 px-3 text-xs sm:text-sm gap-1.5 bg-[#4274D9] hover:bg-[#3561bd] text-white cursor-pointer font-medium">
                <UserPlus className="h-4 w-4" />
                <span>Tambah Siswa</span>
              </Button>
            } />
            <PopoverContent className="w-80 p-4 shadow-xl">
              <form onSubmit={handleAddSubmit} className="space-y-3">
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm leading-none text-foreground">Tambah Siswa Baru</h4>
                  <p className="text-xs text-muted-foreground">Isi data profil siswa kelas {kelasCode.toUpperCase()}</p>
                </div>
                <FieldGroup className="space-y-2.5">
                  <Field>
                    <Label htmlFor="add-nama-heroui-matching" className="text-xs font-semibold">Nama Lengkap</Label>
                    <Input
                      id="add-nama-heroui-matching"
                      value={addNama}
                      onChange={(e) => setAddNama(e.target.value)}
                      placeholder="Nama Siswa"
                      className="h-8 text-xs"
                      required
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="add-nisn-heroui-matching" className="text-xs font-semibold">NISN</Label>
                    <Input
                      id="add-nisn-heroui-matching"
                      value={addNisn}
                      onChange={(e) => setAddNisn(e.target.value)}
                      placeholder="00812345xx"
                      className="h-8 text-xs font-mono"
                      required
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="add-kontak-heroui-matching" className="text-xs font-semibold">
                      Kontak Ortu <span className="text-muted-foreground font-normal">(opsional)</span>
                    </Label>
                    <Input
                      id="add-kontak-heroui-matching"
                      value={addKontak}
                      onChange={(e) => setAddKontak(e.target.value)}
                      placeholder="e.g. 0812-3456-7890"
                      className="h-8 text-xs"
                    />
                  </Field>
                  <Field>
                    <Label className="text-xs font-semibold">Jenis Kelamin</Label>
                    <RadioGroup value={addGender} onValueChange={setAddGender} className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1.5 cursor-pointer">
                        <RadioGroupItem value="cowok" id="add-r-cowok-heroui-matching" />
                        <Label htmlFor="add-r-cowok-heroui-matching" className="text-xs font-medium cursor-pointer">Laki-laki</Label>
                      </div>
                      <div className="flex items-center gap-1.5 cursor-pointer">
                        <RadioGroupItem value="cewek" id="add-r-cewek-heroui-matching" />
                        <Label htmlFor="add-r-cewek-heroui-matching" className="text-xs font-medium cursor-pointer">Perempuan</Label>
                      </div>
                    </RadioGroup>
                  </Field>
                </FieldGroup>
                <div className="flex justify-end gap-2 pt-1">
                  <PopoverClose render={<Button variant="outline" size="sm" type="button" className="h-7 text-xs">Batal</Button>} />
                  <Button type="submit" size="sm" className="h-7 text-xs bg-[#4274D9] hover:bg-[#3561bd] text-white">Simpan</Button>
                </div>
              </form>
            </PopoverContent>
          </Popover>

          {/* Dropdown Pilihan Kelas Binaan (Sebelah Tambah Siswa) */}
          {kelasCode.toLowerCase() !== "9a" && (
            <BinaanClassDropdown
              selectedKelas={kelasCode.toLowerCase()}
              onSelectKelas={(val) => router.push(`/siswa/${val}`)}
            />
          )}

          {/* Tombol Hapus Data & Mode Seleksi */}
          {!isSelectionMode ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs sm:text-sm gap-1.5 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer font-medium"
              onClick={() => setIsSelectionMode(true)}
              disabled={!isMounted || students.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              <span>Hapus Data</span>
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 animate-in fade-in">
              <Button
                variant="destructive"
                size="sm"
                disabled={selectedNisns.length === 0}
                className="h-9 px-3 text-xs sm:text-sm gap-1.5 bg-red-600 hover:bg-red-700 text-white cursor-pointer font-medium"
                onClick={() => setIsBulkDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span>Hapus ({selectedNisns.length})</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs sm:text-sm cursor-pointer border-border hover:bg-accent text-muted-foreground"
                onClick={() => {
                  setIsSelectionMode(false)
                  saveSelectedNisns([])
                }}
              >
                Batal
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            className="h-9 px-3 text-xs sm:text-sm gap-2 cursor-pointer border-border hover:bg-accent"
            onClick={() => setIsExportOpen(true)}
            disabled={!isMounted || students.length === 0}
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* HeroUI Table Component */}
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Data Siswa Table" className="min-w-[760px]">
            <Table.Header>
              {isSelectionMode && (
                <Table.Column className="w-10 text-center animate-in fade-in">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleToggleHeaderCheckbox}
                      aria-label="Pilih Semua Siswa"
                      className="cursor-pointer"
                    />
                  </div>
                </Table.Column>
              )}
              <Table.Column className="text-foreground font-semibold">No Abs</Table.Column>
              <Table.Column className="text-foreground font-semibold">NISN</Table.Column>
              <Table.Column isRowHeader className="text-foreground font-semibold">Nama</Table.Column>
              <Table.Column className="text-foreground font-semibold">L/P</Table.Column>
              <Table.Column className="text-foreground font-semibold">Kontak Ortu</Table.Column>
              <Table.Column className="text-foreground font-semibold text-center">Aksi</Table.Column>
            </Table.Header>
            <Table.Body>
              {paginatedStudents.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={isSelectionMode ? 7 : 6} className="text-center py-10 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        {searchQuery ? <UserX className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">
                          {searchQuery ? "Data Siswa Tidak Ditemukan" : "Belum Ada Data Siswa"}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {searchQuery
                            ? `Tidak ada siswa yang cocok dengan kata kunci "${searchQuery}".`
                            : `Belum ada data siswa terdaftar untuk Kelas ${kelasCode.toUpperCase()}. Silakan tambah data siswa atau impor berkas.`}
                        </p>
                      </div>
                      {!searchQuery && (
                        <Button
                          size="sm"
                          onClick={() => setIsAddOpen(true)}
                          className="h-8 text-xs bg-[#4274D9] hover:bg-[#3561bd] text-white gap-1.5 font-medium mt-1 cursor-pointer"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Tambah Siswa Pertama</span>
                        </Button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ) : (
                paginatedStudents.map((student) => (
                  <Table.Row key={student.nisn}>
                    {isSelectionMode && (
                      <Table.Cell className="text-center animate-in fade-in">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedNisns.includes(student.nisn)}
                            onCheckedChange={() => handleToggleSelect(student.nisn)}
                            aria-label={`Pilih ${student.nama}`}
                            className="cursor-pointer"
                          />
                        </div>
                      </Table.Cell>
                    )}
                    <Table.Cell>{student.noAbs}</Table.Cell>
                    <Table.Cell className="font-mono">{student.nisn}</Table.Cell>
                    <Table.Cell>
                      <span className="font-medium text-foreground block">{student.nama}</span>
                    </Table.Cell>
                    <Table.Cell>{student.gender}</Table.Cell>
                    <Table.Cell className="font-mono text-xs text-muted-foreground">
                      {student.kontakOrtu && student.kontakOrtu !== "" ? student.kontakOrtu : "-"}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          title="Edit Data Siswa"
                          onClick={() => handleOpenEdit(student)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Hapus Data Siswa"
                          onClick={() => setDeletingStudent(student)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      {/* Pagination Footer */}
      {filteredStudents.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
          <div>
            Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredStudents.length)} dari {filteredStudents.length} siswa
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
                    className="cursor-pointer font-medium"
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
      )}

      {/* Dialog Export */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleExportSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <Download className="h-5 w-5 text-[#4274D9]" />
                <span>Export Data Siswa</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Pilih format dokumen dan atur metadata sebelum mengunduh data siswa.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Format Dokumen</Label>
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
                    <RadioGroupItem value="pdf" id="export-pdf-heroui-match" />
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-red-500 shrink-0" />
                      <Label htmlFor="export-pdf-heroui-match" className="text-xs font-medium cursor-pointer">
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
                    <RadioGroupItem value="excel" id="export-excel-heroui-match" />
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                      <Label htmlFor="export-excel-heroui-match" className="text-xs font-medium cursor-pointer">
                        Excel (.xlsx)
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <FieldGroup className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <Label htmlFor="export-tgl-heroui-match" className="text-xs font-semibold">Tanggal</Label>
                    <Input
                      id="export-tgl-heroui-match"
                      value={exportTanggal}
                      onChange={(e) => setExportTanggal(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="export-wali-heroui-match" className="text-xs font-semibold">Wali Kelas</Label>
                    <Input
                      id="export-wali-heroui-match"
                      value={exportWaliKelas}
                      onChange={(e) => setExportWaliKelas(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                  </Field>
                </div>
              </FieldGroup>
            </div>

            <DialogFooter className="mt-2">
              <DialogClose render={<Button variant="outline" size="sm" type="button" className="h-8 text-xs px-3">Batal</Button>} />
              <Button type="submit" size="sm" className="h-8 text-xs px-3 gap-1.5 bg-[#4274D9] hover:bg-[#3561bd] text-white cursor-pointer">
                <Download className="h-3.5 w-3.5" />
                <span>Unduh Dokumen</span>
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
                Ubah data profil siswa kelas {kelasCode.toUpperCase()}
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-2 space-y-3">
              <Field>
                <Label htmlFor="edit-name-heroui-match">Nama Lengkap</Label>
                <Input
                  id="edit-name-heroui-match"
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="edit-nisn-heroui-match">NISN</Label>
                <Input
                  id="edit-nisn-heroui-match"
                  value={editNisn}
                  onChange={(e) => setEditNisn(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="edit-kontak-heroui-match">
                  Kontak Ortu <span className="text-muted-foreground font-normal">(opsional)</span>
                </Label>
                <Input
                  id="edit-kontak-heroui-match"
                  value={editKontak}
                  onChange={(e) => setEditKontak(e.target.value)}
                  placeholder="Kosongkan jika tidak ada (-)"
                />
              </Field>
              <Field>
                <Label className="text-sm font-medium text-foreground">Jenis Kelamin</Label>
                <RadioGroup value={editGender} onValueChange={setEditGender} className="flex items-center gap-6 mt-1">
                  <div className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="cowok" id="edit-r-cowok-heroui-match" />
                    <Label htmlFor="edit-r-cowok-heroui-match" className="text-sm font-medium cursor-pointer">Laki-laki</Label>
                  </div>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="cewek" id="edit-r-cewek-heroui-match" />
                    <Label htmlFor="edit-r-cewek-heroui-match" className="text-sm font-medium cursor-pointer">Perempuan</Label>
                  </div>
                </RadioGroup>
              </Field>
            </FieldGroup>
            <DialogFooter className="mt-4">
              <DialogClose render={<Button variant="outline" type="button">Batal</Button>} />
              <Button type="submit" className="bg-[#4274D9] hover:bg-[#3561bd] text-white cursor-pointer">
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Hapus Data Siswa (Single) */}
      <Dialog open={deletingStudent !== null} onOpenChange={(open) => { if (!open) setDeletingStudent(null) }}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleConfirmDelete}>
            <DialogHeader>
              <DialogTitle>Hapus data siswa</DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus data <strong>{deletingStudent?.nama}</strong> ({deletingStudent?.nisn})?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <DialogClose render={<Button variant="outline" type="button">Batal</Button>} />
              <Button type="submit" variant="destructive" className="bg-red-600 hover:bg-red-700 text-white cursor-pointer">
                Hapus
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Beberapa / Semua Data Siswa */}
      <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              <span>Konfirmasi Hapus Data Siswa</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong className="text-foreground font-semibold">{selectedNisns.length} data siswa</strong> yang dipilih untuk Kelas {kelasCode.toUpperCase()}? Data yang telah dihapus tidak dapat dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <DialogClose render={<Button variant="outline" size="sm" type="button" className="h-8 text-xs">Batal</Button>} />
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-medium cursor-pointer"
              onClick={handleExecuteBulkDelete}
            >
              Ya, Hapus {selectedNisns.length} Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-card p-4 text-xs font-medium text-emerald-600 dark:text-emerald-400 shadow-xl ring-1 ring-foreground/10 animate-in fade-in slide-in-from-bottom-4">
          <Download className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
