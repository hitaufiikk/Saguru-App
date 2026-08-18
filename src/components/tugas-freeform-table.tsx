"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { BinaanClassDropdown } from "@/components/binaan-class-dropdown"
import {
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  UserPlus,
  Loader2,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  StickyNote,
  Users,
  AlertCircle,
  Tag,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { studentService, StudentRecord } from "@/lib/services/studentService"
import { tugasService } from "@/lib/services/tugasService"
import { cn } from "@/lib/utils"
import { exportCatatanBinaanToExcel, exportCatatanBinaanToPDF } from "@/lib/export-utils"

export interface StudentBase {
  noAbs: number
  nisn: string
  nama: string
  gender: string
}

const defaultStudents: StudentBase[] = [
  { noAbs: 1, nisn: "0081234561", nama: "Ahmad Fauzi", gender: "Laki-laki" },
  { noAbs: 2, nisn: "0081234562", nama: "Aisha Rahma", gender: "Perempuan" },
  { noAbs: 3, nisn: "0081234563", nama: "Budi Santoso", gender: "Laki-laki" },
  { noAbs: 4, nisn: "0081234564", nama: "Cantika Putri", gender: "Perempuan" },
  { noAbs: 5, nisn: "0081234565", nama: "Deni Kurniawan", gender: "Laki-laki" },
  { noAbs: 6, nisn: "0081234566", nama: "Dewi Lestari", gender: "Perempuan" },
  { noAbs: 7, nisn: "0081234567", nama: "Eko Prasetyo", gender: "Laki-laki" },
  { noAbs: 8, nisn: "0081234568", nama: "Fitri Handayani", gender: "Perempuan" },
  { noAbs: 9, nisn: "0081234569", nama: "Gilang Ramadhan", gender: "Laki-laki" },
  { noAbs: 10, nisn: "0081234570", nama: "Hania Nabila", gender: "Perempuan" },
  { noAbs: 11, nisn: "0081234571", nama: "Indra Wijaya", gender: "Laki-laki" },
  { noAbs: 12, nisn: "0081234572", nama: "Jasmine Kartika", gender: "Perempuan" },
  { noAbs: 13, nisn: "0081234573", nama: "Kevin Pratama", gender: "Laki-laki" },
  { noAbs: 14, nisn: "0081234574", nama: "Larasati Anggraini", gender: "Perempuan" },
  { noAbs: 15, nisn: "0081234575", nama: "Muhammad Rizky", gender: "Laki-laki" },
]

const QUICK_TAGS = [
  "Lengkap",
  "Belum Kumpul",
  "Tugas Bab 1",
  "Tugas Bab 2",
  "Remedial",
  "Perlu Bimbingan",
]

export function TugasFreeformTable({ kelasCode = "9b" }: { kelasCode?: string } = {}) {
  const router = useRouter()
  const [students, setStudents] = useState<StudentBase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [savingStatus, setSavingStatus] = useState<Record<string, "saving" | "saved" | "idle">>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Add Student Dialog
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false)
  const [newStudentNisn, setNewStudentNisn] = useState("")
  const [newStudentNama, setNewStudentNama] = useState("")
  const [newStudentGender, setNewStudentGender] = useState("Laki-laki")
  const [addStudentLoading, setAddStudentLoading] = useState(false)

  // Current selected class for dropdown
  const currentKelas = kelasCode.toLowerCase()

  // Load students & notes
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      setIsLoading(true)
      try {
        // 1. Check localStorage first for instant display
        const localKey = `sag_binaan_notes_${currentKelas}`
        const localData = typeof window !== "undefined" ? localStorage.getItem(localKey) : null
        let localNotesMap: Record<string, string> = {}
        if (localData) {
          try {
            localNotesMap = JSON.parse(localData)
            if (isMounted) setNotes(localNotesMap)
          } catch (e) {
            console.warn("Failed to parse local notes", e)
          }
        }

        // 2. Fetch from Supabase
        const [supStudents, supExclusions, supNotes] = await Promise.all([
          studentService.getStudentsByClass(currentKelas),
          tugasService.getTugasExclusions(currentKelas),
          tugasService.getBinaanNotes(currentKelas),
        ])

        if (isMounted) {
          // Set students
          if (supStudents && supStudents.length > 0) {
            setStudents(
              supStudents
                .filter((s) => !supExclusions.includes(s.nisn))
                .map((s, idx) => ({
                  noAbs: s.noAbs || idx + 1,
                  nisn: s.nisn,
                  nama: s.nama,
                  gender: s.gender || "Laki-laki",
                }))
            )
          } else {
            setStudents(defaultStudents)
          }

          // Merge notes with priority to remote if present
          const mergedNotes = { ...localNotesMap, ...supNotes }
          setNotes(mergedNotes)
          if (typeof window !== "undefined") {
            localStorage.setItem(localKey, JSON.stringify(mergedNotes))
          }
        }
      } catch (err) {
        console.error("Error loading binaan data:", err)
        if (isMounted && students.length === 0) {
          setStudents(defaultStudents)
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [currentKelas])

  // Handle Note Change with Auto-Save
  const handleNoteChange = (nisn: string, text: string) => {
    // 1. Update state immediately
    const updated = { ...notes, [nisn]: text }
    setNotes(updated)
    setSavingStatus((prev) => ({ ...prev, [nisn]: "saving" }))

    // 2. Save to localStorage
    const localKey = `sag_binaan_notes_${currentKelas}`
    if (typeof window !== "undefined") {
      localStorage.setItem(localKey, JSON.stringify(updated))
    }

    // 3. Debounced save to Supabase
    debounceSaveNote(nisn, text)
  }

  // Debounce Map
  const debounceTimers = React.useRef<Record<string, NodeJS.Timeout>>({})

  const debounceSaveNote = (nisn: string, text: string) => {
    if (debounceTimers.current[nisn]) {
      clearTimeout(debounceTimers.current[nisn])
    }

    debounceTimers.current[nisn] = setTimeout(async () => {
      try {
        await tugasService.saveBinaanNote(nisn, currentKelas, text)
        setSavingStatus((prev) => ({ ...prev, [nisn]: "saved" }))
        setTimeout(() => {
          setSavingStatus((prev) => ({ ...prev, [nisn]: "idle" }))
        }, 2000)
      } catch (e) {
        setSavingStatus((prev) => ({ ...prev, [nisn]: "idle" }))
      }
    }, 600)
  }

  // Append quick tag to student's note
  const handleAddQuickTag = (nisn: string, tag: string) => {
    const currentText = (notes[nisn] || "").trim()
    let newText = ""
    if (!currentText) {
      newText = tag
    } else if (currentText.includes(tag)) {
      return // Tag already included
    } else {
      newText = `${currentText}, ${tag}`
    }
    handleNoteChange(nisn, newText)
  }

  // Clear single student note
  const handleClearNote = (nisn: string) => {
    handleNoteChange(nisn, "")
  }

  // Add new student
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStudentNama.trim() || !newStudentNisn.trim()) return

    setAddStudentLoading(true)
    try {
      const newRec: StudentRecord = {
        nisn: newStudentNisn.trim(),
        nama: newStudentNama.trim(),
        gender: newStudentGender,
        kelas_code: currentKelas,
      }

      await studentService.addStudent(newRec)

      const updatedList: StudentBase[] = [
        ...students,
        {
          noAbs: students.length + 1,
          nisn: newStudentNisn.trim(),
          nama: newStudentNama.trim(),
          gender: newStudentGender,
        },
      ]

      setStudents(updatedList)
      setIsAddStudentOpen(false)
      setNewStudentNisn("")
      setNewStudentNama("")
      setNewStudentGender("Laki-laki")
    } catch (err) {
      console.error("Error adding student:", err)
    } finally {
      setAddStudentLoading(false)
    }
  }

  // Exclude / Hide Student
  const handleExcludeStudent = async (nisn: string) => {
    if (!confirm("Sembunyikan siswa ini dari daftar tagihan tugas?")) return
    try {
      await tugasService.addTugasExclusion(nisn, currentKelas)
      setStudents((prev) => prev.filter((s) => s.nisn !== nisn))
    } catch (err) {
      console.error("Error excluding student:", err)
    }
  }

  // Filtered Students
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students
    const q = searchTerm.toLowerCase()
    return students.filter(
      (s) => s.nama.toLowerCase().includes(q) || s.nisn.toLowerCase().includes(q)
    )
  }, [students, searchTerm])

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredStudents.slice(start, start + pageSize)
  }, [filteredStudents, currentPage, pageSize])

  // Statistics
  const filledNotesCount = useMemo(() => {
    return students.filter((s) => (notes[s.nisn] || "").trim() !== "").length
  }, [students, notes])

  // Export handlers
  const handleExportExcel = () => {
    const exportData = students.map((s) => ({
      noAbs: s.noAbs,
      nisn: s.nisn,
      nama: s.nama,
      gender: s.gender,
      catatan: notes[s.nisn] || "-",
    }))

    exportCatatanBinaanToExcel({
      students: exportData,
      kelas: currentKelas,
      tahun: "2025/2026",
      waliKelas: "Bu Devy",
    })
  }

  const handleExportPDF = () => {
    const exportData = students.map((s) => ({
      noAbs: s.noAbs,
      nisn: s.nisn,
      nama: s.nama,
      gender: s.gender,
      catatan: notes[s.nisn] || "-",
    }))

    exportCatatanBinaanToPDF({
      students: exportData,
      kelas: currentKelas,
      tahun: "2025/2026",
      waliKelas: "Bu Devy",
    })
  }

  return (
    <div className="space-y-5">
      {/* 1. Header Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-2 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <StickyNote className="h-6 w-6 text-primary" />
              Tagihan Tugas Kelas {currentKelas.toUpperCase()}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              Form Catatan Bebas
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Form pencatatan tagihan tugas dan keterangan evaluasi bebas per siswa khusus kelas binaan.
          </p>
        </div>

        {/* Action Buttons & Dropdown */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Kelas Dropdown */}
          <BinaanClassDropdown
            selectedKelas={currentKelas}
            onSelectKelas={(kelas) => {
              router.push(`/tugas/${kelas}`)
            }}
          />

          {/* Add Student Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddStudentOpen(true)}
            className="h-9 gap-1.5 text-xs font-medium bg-background cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Tambah Siswa</span>
          </Button>

          {/* Export Dropdown / Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="h-9 gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-background border-emerald-500/20 hover:bg-emerald-500/10 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Excel</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="h-9 gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-background border-red-500/20 hover:bg-red-500/10 cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </div>

      {/* 2. Stats & Quick Filter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center gap-3 shadow-2xs">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Total Siswa</div>
            <div className="text-lg font-bold text-foreground">{students.length} Siswa</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center gap-3 shadow-2xs">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Sudah Ada Catatan</div>
            <div className="text-lg font-bold text-emerald-600">
              {filledNotesCount} / {students.length}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center gap-3 shadow-2xs">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Belum Ada Catatan</div>
            <div className="text-lg font-bold text-amber-600">
              {students.length - filledNotesCount} Siswa
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari siswa berdasarkan nama atau NISN..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9 h-9 text-xs sm:text-sm bg-background border-border"
          />
        </div>

        <div className="text-xs text-muted-foreground hidden sm:block">
          Sinkronisasi otomatis aktif (HP & Laptop)
        </div>
      </div>

      {/* 4. Table / Content View */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs sm:text-sm">Memuat data kelas {currentKelas.toUpperCase()}...</p>
        </div>
      ) : paginatedStudents.length === 0 ? (
        <div className="py-16 text-center border rounded-xl border-dashed border-border p-6">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium text-foreground">Tidak ada data siswa ditemukan</p>
          <p className="text-xs text-muted-foreground mt-1">
            Coba sesuaikan kata kunci pencarian Anda.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop & Tablet Table */}
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-muted-foreground font-semibold">
                  <th className="py-3 px-3.5 text-center w-14">No</th>
                  <th className="py-3 px-3.5 text-center w-28">NISN</th>
                  <th className="py-3 px-3.5 min-w-[160px]">Nama Siswa</th>
                  <th className="py-3 px-3 text-center w-14">L/P</th>
                  <th className="py-3 px-3.5 min-w-[280px]">Catatan / Tagihan Tugas Bebas</th>
                  <th className="py-3 px-3 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedStudents.map((student) => {
                  const studentNote = notes[student.nisn] || ""
                  const status = savingStatus[student.nisn] || "idle"

                  return (
                    <tr
                      key={student.nisn}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* No Absen */}
                      <td className="py-3 px-3.5 text-center font-medium text-muted-foreground align-top pt-4">
                        {student.noAbs}
                      </td>

                      {/* NISN */}
                      <td className="py-3 px-3.5 text-center font-mono text-xs text-muted-foreground align-top pt-4">
                        {student.nisn}
                      </td>

                      {/* Nama Siswa */}
                      <td className="py-3 px-3.5 align-top pt-4">
                        <div className="font-medium text-foreground">
                          {student.nama}
                        </div>
                        <div className="text-[11px] text-muted-foreground sm:hidden">
                          {student.gender} • {student.nisn}
                        </div>
                      </td>

                      {/* Gender */}
                      <td className="py-3 px-3 text-center align-top pt-4">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold",
                            student.gender === "Laki-laki" || student.gender === "L"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "bg-pink-500/10 text-pink-600 dark:text-pink-400"
                          )}
                        >
                          {student.gender === "Laki-laki" || student.gender === "L" ? "L" : "P"}
                        </span>
                      </td>

                      {/* Input Catatan Bebas & Quick Chips */}
                      <td className="py-2.5 px-3.5 align-top">
                        <div className="space-y-2">
                          <div className="relative">
                            <textarea
                              rows={2}
                              value={studentNote}
                              onChange={(e) => handleNoteChange(student.nisn, e.target.value)}
                              placeholder="Tulis catatan / tagihan tugas siswa di sini..."
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs sm:text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-y min-h-[42px]"
                            />

                            {/* Status Indicator */}
                            <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1 text-[10px]">
                              {status === "saving" && (
                                <span className="flex items-center gap-1 text-muted-foreground bg-background/80 px-1 rounded">
                                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                  <span>Menyimpan...</span>
                                </span>
                              )}
                              {status === "saved" && (
                                <span className="flex items-center gap-1 text-emerald-600 font-medium bg-background/80 px-1 rounded animate-fade-in">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Tersimpan</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Tag Chips */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mr-0.5">
                              <Tag className="h-2.5 w-2.5" />
                              Cepat:
                            </span>
                            {QUICK_TAGS.map((tag) => {
                              const isSelected = studentNote.includes(tag)
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => handleAddQuickTag(student.nisn, tag)}
                                  className={cn(
                                    "px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors border cursor-pointer",
                                    isSelected
                                      ? "bg-primary/15 text-primary border-primary/30"
                                      : "bg-muted/60 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                                  )}
                                >
                                  {tag}
                                </button>
                              )
                            })}
                            {studentNote && (
                              <button
                                type="button"
                                onClick={() => handleClearNote(student.nisn)}
                                className="px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-red-500 transition-colors ml-auto cursor-pointer"
                                title="Hapus catatan"
                              >
                                Bersihkan
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-3 text-center align-top pt-4">
                        <button
                          type="button"
                          onClick={() => handleExcludeStudent(student.nisn)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Sembunyikan siswa dari tagihan tugas"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-muted-foreground">
                Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
                {Math.min(currentPage * pageSize, filteredStudents.length)} dari{" "}
                {filteredStudents.length} siswa
              </div>
              <Pagination className="justify-end w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage > 1) setCurrentPage((p) => p - 1)
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setCurrentPage(page)
                        }}
                        isActive={currentPage === page}
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
                        if (currentPage < totalPages) setCurrentPage((p) => p + 1)
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}

      {/* 5. Add Student Dialog */}
      <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddStudentSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Tambah Siswa Kelas {currentKelas.toUpperCase()}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Tambahkan siswa baru ke dalam daftar kelas binaan ini.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3.5 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="nisn" className="text-xs font-semibold">
                  NISN <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nisn"
                  placeholder="Contoh: 0081234599"
                  value={newStudentNisn}
                  onChange={(e) => setNewStudentNisn(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nama" className="text-xs font-semibold">
                  Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nama"
                  placeholder="Masukkan nama lengkap siswa"
                  value={newStudentNama}
                  onChange={(e) => setNewStudentNama(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Jenis Kelamin</Label>
                <RadioGroup
                  value={newStudentGender}
                  onValueChange={setNewStudentGender}
                  className="flex gap-4 pt-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Laki-laki" id="gender-l" />
                    <Label htmlFor="gender-l" className="text-xs cursor-pointer">
                      Laki-laki (L)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Perempuan" id="gender-p" />
                    <Label htmlFor="gender-p" className="text-xs cursor-pointer">
                      Perempuan (P)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setIsAddStudentOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={addStudentLoading}
                className="text-xs gap-1.5"
              >
                {addStudentLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Simpan Siswa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
