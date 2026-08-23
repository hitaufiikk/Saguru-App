"use client"

import { useState, useEffect } from "react";
import { Table } from "@heroui/react";
import { Edit3, Trash2, Search, UserPlus, Download, FileText, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  exportToExcel,
  exportToPDF,
  getFormattedCurrentDate,
  getFormattedCurrentDateTime,
} from "@/lib/export-utils"

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
  return "HADIR"
}

export function Basic({ kelasCode = "9a" }: { kelasCode?: string } = {}) {
  const [students, setStudents] = useState<StudentItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("saguru_migrated_students")
        const deletedPresensi = localStorage.getItem("saguru_presensi_deleted_nisns")
        const deletedMap = deletedPresensi ? JSON.parse(deletedPresensi) : {}
        const hiddenNisns: string[] = deletedMap[kelasCode?.toLowerCase()] || []

        if (stored) {
          const map = JSON.parse(stored)
          if (map[kelasCode?.toLowerCase()] && Array.isArray(map[kelasCode?.toLowerCase()])) {
            const classStudents: StudentItem[] = map[kelasCode?.toLowerCase()]
            return classStudents
              .filter((s) => !hiddenNisns.includes(s.nisn))
              .map((s) => ({ ...s, status: getValidAttendanceStatus(s.status) }))
          }
        }
      } catch (err) {
        console.error("Error reading localStorage:", err)
      }
    }
    return []
  })

  // Listen for data updates
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const stored = localStorage.getItem("saguru_migrated_students")
        const deletedPresensi = localStorage.getItem("saguru_presensi_deleted_nisns")
        const deletedMap = deletedPresensi ? JSON.parse(deletedPresensi) : {}
        const hiddenNisns: string[] = deletedMap[kelasCode?.toLowerCase()] || []

        if (stored) {
          const map = JSON.parse(stored)
          if (map[kelasCode?.toLowerCase()] && Array.isArray(map[kelasCode?.toLowerCase()])) {
            const classStudents: StudentItem[] = map[kelasCode?.toLowerCase()]
            setStudents(
              classStudents
                .filter((s) => !hiddenNisns.includes(s.nisn))
                .map((s) => ({ ...s, status: getValidAttendanceStatus(s.status) }))
            )
            return
          }
        }
        setStudents([])
      } catch (err) {}
    }
    handleUpdate()
    window.addEventListener("saguru-data-updated", handleUpdate)
    return () => window.removeEventListener("saguru-data-updated", handleUpdate)
  }, [kelasCode])

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

  // State Dialog Hapus Siswa
  const [deletingStudent, setDeletingStudent] = useState<StudentItem | null>(null)

  // Persistent Multi-select Key
  const storageKey = `saguru_selected_presensi_${kelasCode.toLowerCase()}`

  // Multi-select & Bulk Delete State
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedNisns, setSelectedNisns] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) return JSON.parse(stored)
      } catch (err) {}
    }
    return []
  })
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

  // Load selection when kelasCode changes
  useEffect(() => {
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
      const deletedPresensi = localStorage.getItem("saguru_presensi_deleted_nisns")
      const deletedMap = deletedPresensi ? JSON.parse(deletedPresensi) : {}
      const existingHidden: string[] = deletedMap[kelasCode.toLowerCase()] || []
      const newHidden = Array.from(new Set([...existingHidden, ...selectedNisns]))
      deletedMap[kelasCode.toLowerCase()] = newHidden
      localStorage.setItem("saguru_presensi_deleted_nisns", JSON.stringify(deletedMap))

      localStorage.removeItem(storageKey)
    } catch (err) {}
    saveSelectedNisns([])
    setIsBulkDeleteOpen(false)
    setIsSelectionMode(false)
  }

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
      setExportTanggal(todayDate)

      window.dispatchEvent(new Event("saguru-data-updated"))
    } catch (err) {}
  }

  const handleSaveDispen = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!dispenStudent) return

    const updated = students.map((s) =>
      s.nisn === dispenStudent.nisn
        ? {
            ...s,
            status: "DISPEN",
            alasanDispen: dispenAlasan.trim(),
          }
        : s
    )
    setStudents(updated)
    syncToLocalStorage(updated)
    setDispenStudent(null)
    setDispenAlasan("")
  }

  const handleSetStatus = (nisn: string, newStatus: string) => {
    const updated = students.map((s) =>
      s.nisn === nisn
        ? {
            ...s,
            status: newStatus,
            alasanDispen: "",
          }
        : s
    )
    setStudents(updated)
    syncToLocalStorage(updated)
  }

  // State Dialog Export Data
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf")
  const [exportWaliKelas, setExportWaliKelas] = useState("Devy, S.Pd.")
  const [exportKelas, setExportKelas] = useState(`Kelas ${kelasCode.toUpperCase()}`)
  const [exportTahun, setExportTahun] = useState("2026/2027")
  const [exportTanggal, setExportTanggal] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const storedDate = localStorage.getItem(`saguru_presensi_date_${kelasCode.toLowerCase()}`)
      if (storedDate) return storedDate
    }
    return getFormattedCurrentDate()
  })
  const [toastMessage, setToastMessage] = useState<string | null>(null)

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

  const handleConfirmDelete = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!deletingStudent) return

    const updated = students.filter((s) => s.nisn !== deletingStudent.nisn)
    setStudents(updated)
    syncToLocalStorage(updated)
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

    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  return (
    <div className="space-y-4">
      {/* Fitur Search & Export Data */}
      <div className="flex items-center justify-between gap-4">
        {/* Kiri: Search Input */}
        <div className="relative w-72 sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Cari nama atau NISN..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9 h-9 text-xs sm:text-sm bg-background border-border"
          />
        </div>

        {/* Kanan: Tombol Hapus Data & Export */}
        <div className="flex items-center gap-2">
          {!isSelectionMode ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs sm:text-sm gap-1.5 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer font-medium"
              onClick={() => setIsSelectionMode(true)}
              disabled={students.length === 0}
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
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label={`Data Presensi Siswa Kelas ${kelasCode.toUpperCase()}`} className="min-w-[760px]">
            <Table.Header>
              {isSelectionMode && (
                <Table.Column className="w-10 text-center animate-in fade-in">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleToggleHeaderCheckbox}
                      aria-label="Pilih Semua Siswa Presensi"
                      className="cursor-pointer"
                    />
                  </div>
                </Table.Column>
              )}
              <Table.Column className="text-foreground font-semibold">No Abs</Table.Column>
              <Table.Column className="text-foreground font-semibold">NISN</Table.Column>
              <Table.Column className="text-foreground font-semibold">Nama</Table.Column>
              <Table.Column className="text-foreground font-semibold">L/P</Table.Column>
              <Table.Column className="text-foreground font-semibold text-center">Status Presensi</Table.Column>
            </Table.Header>
            <Table.Body>
              {paginatedStudents.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={isSelectionMode ? 6 : 5} className="text-center py-6 text-muted-foreground">
                    Tidak ada data siswa yang cocok dengan pencarian &quot;{searchQuery}&quot;
                  </Table.Cell>
                </Table.Row>
              ) : (
                paginatedStudents.map((student) => {
                  const currentStatus = getValidAttendanceStatus(student.status)
                  return (
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
                        {currentStatus === "DISPEN" && student.alasanDispen && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium italic block mt-0.5">
                            Alasan Dispen: {student.alasanDispen}
                          </span>
                        )}
                      </Table.Cell>
                      <Table.Cell>{student.gender}</Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center justify-center gap-1.5">
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
                        </div>
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
                <span>Export Data Siswa</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Pilih format dokumen dan atur metadata sebelum mengunduh data siswa.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              {/* Tahap 1: Opsi Format Export */}
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
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <Label htmlFor="export-heroui-tanggal" className="text-xs font-semibold">Tanggal Presensi</Label>
                    <Input
                      id="export-heroui-tanggal"
                      name="tanggal"
                      value={exportTanggal}
                      onChange={(e) => setExportTanggal(e.target.value)}
                      placeholder="13 Agustus 2026"
                      className="h-9 text-xs"
                      required
                    />
                  </Field>

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
                </div>

                <div className="grid grid-cols-2 gap-3">
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

                  <Field>
                    <Label className="text-xs font-semibold">Tahun Ajaran</Label>
                    <Select value={exportTahun} onValueChange={(val) => val && setExportTahun(val)}>
                      <SelectTrigger className="w-full h-9 text-xs">
                        <SelectValue placeholder="Pilih Tahun" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2026/2027">2026/2027</SelectItem>
                        <SelectItem value="2027/2028">2027/2028</SelectItem>
                        <SelectItem value="2028/2029">2028/2029</SelectItem>
                        <SelectItem value="2029/2030">2029/2030</SelectItem>
                        <SelectItem value="2030/2031">2030/2031</SelectItem>
                        <SelectItem value="2031/2032">2031/2032</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </FieldGroup>

              {/* Tahap 3: Area Preview Ringkas (Format Presensi Sesuai Layout Template) */}
              <div className="rounded-lg border border-border/80 bg-muted/60 p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="font-semibold text-foreground">Draft Dokumen Presensi</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-bold uppercase">
                    {exportFormat === "pdf" ? "PDF Document" : "Excel (.xlsx)"}
                  </span>
                </div>

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

                  <div className="pt-2 font-sans">
                    <div className="grid grid-cols-12 gap-1 bg-muted p-1 text-[9px] font-bold border text-center text-foreground">
                      <div className="col-span-1">NO</div>
                      <div className="col-span-2">NISN</div>
                      <div className="col-span-4 text-left pl-1">NAMA</div>
                      <div className="col-span-1">L/P</div>
                      <div className="col-span-2">STATUS</div>
                      <div className="col-span-2 text-left pl-1">KET</div>
                    </div>
                    <div className="divide-y border-x border-b text-[9px]">
                      {students.slice(0, 3).map((s) => (
                        <div key={s.nisn} className="grid grid-cols-12 gap-1 p-1 text-center items-center">
                          <div className="col-span-1 font-mono">{s.noAbs}</div>
                          <div className="col-span-2 font-mono text-muted-foreground truncate">{s.nisn}</div>
                          <div className="col-span-4 text-left truncate pl-1 font-medium">{s.nama.toUpperCase()}</div>
                          <div className="col-span-1">{s.gender === "Laki-laki" ? "L" : "P"}</div>
                          <div className="col-span-2 font-bold">{s.status || "HADIR"}</div>
                          <div className="col-span-2 text-left truncate pl-1 text-[8px] text-muted-foreground">
                            {s.status === "DISPEN" ? (s.alasanDispen || "Dispen") : "-"}
                          </div>
                        </div>
                      ))}
                      {students.length > 3 && (
                        <div className="p-1 text-center text-muted-foreground italic text-[9px]">
                          ... dan {students.length - 3} siswa lainnya ...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground space-y-1 pt-1 border-t border-border/40 font-sans">
                  <div className="flex justify-between items-center">
                    <span>Rekap Presensi: <strong className="text-foreground">H: {students.filter((s) => (s.status || "HADIR") === "HADIR").length}</strong> | <strong className="text-amber-600">D: {students.filter((s) => s.status === "DISPEN").length}</strong> | <strong className="text-rose-600">S: {students.filter((s) => s.status === "SAKIT").length}</strong> | <strong className="text-sky-600">A: {students.filter((s) => s.status === "ALPHA").length}</strong></span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Format Presensi</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span>Gender: L ({students.filter((s) => s.gender === "Laki-laki" || s.gender === "L").length}) | P ({students.filter((s) => s.gender === "Perempuan" || s.gender === "P").length})</span>
                    <span>Total: <strong className="text-foreground font-semibold">{students.length} Siswa</strong></span>
                  </div>
                </div>
              </div>
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
      <Dialog open={dispenStudent !== null} onOpenChange={(open) => { if (!open) setDispenStudent(null) }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveDispen} className="space-y-4">
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
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Beberapa / Semua Data Presensi */}
      <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              <span>Konfirmasi Hapus Data Presensi</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong className="text-foreground font-semibold">{selectedNisns.length} data siswa</strong> dari daftar presensi Kelas {kelasCode.toUpperCase()}? Data yang telah dihapus tidak dapat dikembalikan.
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

      {/* Dialog Hapus Data Siswa */}
      <Dialog open={deletingStudent !== null} onOpenChange={(open) => { if (!open) setDeletingStudent(null) }}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleConfirmDelete}>
            <DialogHeader>
              <DialogTitle>Hapus data siswa</DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus data siswa <strong className="text-foreground">{deletingStudent?.nama}</strong>? Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <DialogClose render={<Button variant="outline" type="button">Batal</Button>} />
              <Button variant="destructive" type="submit" className="cursor-pointer">
                OK, Hapus
              </Button>
            </DialogFooter>
          </form>
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
  );
}

export default function HeroUITableAnatomy() {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Example table">
          <Table.Header>
            <Table.Column className="text-foreground font-semibold">No Abs</Table.Column>
            <Table.Column className="text-foreground font-semibold">NISN</Table.Column>
            <Table.Column className="text-foreground font-semibold">Nama</Table.Column>
            <Table.Column className="text-foreground font-semibold">L/P</Table.Column>
            <Table.Column className="text-foreground font-semibold text-center">Aksi</Table.Column>
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

                  <Dialog>
                    <DialogTrigger
                      render={
                        <button className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors cursor-pointer" title="Hapus">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      }
                    />
                    <DialogContent className="sm:max-w-sm">
                      <form onSubmit={(e) => e.preventDefault()}>
                        <DialogHeader>
                          <DialogTitle>Hapus data siswa</DialogTitle>
                          <DialogDescription>
                            Apakah Anda yakin ingin menghapus data siswa ini? Tindakan ini tidak dapat dibatalkan.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="mt-4">
                          <DialogClose render={<Button variant="outline">Batal</Button>} />
                          <Button variant="destructive" type="submit">OK, Hapus</Button>
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
