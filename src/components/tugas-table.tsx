"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BinaanClassDropdown } from "@/components/binaan-class-dropdown"
import {
  Search,
  Download,
  PlusCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Trash2,
  UserPlus,
  Loader2,
} from "lucide-react"

import { Table } from "@heroui/react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
} from "@/components/ui/popover"
import { Field, FieldGroup } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { studentService } from "@/lib/services/studentService"
import { tugasService } from "@/lib/services/tugasService"
import { cn } from "@/lib/utils"
import { exportTugasToExcel, exportTugasToPDF } from "@/lib/export-utils"

// Types
export interface StudentBase {
  noAbs: number
  nisn: string
  nama: string
  gender: string
}

export interface TaskDefinition {
  id: number // 1 to 30
  mapel: string
  kelasCode?: string
  title: string
  deadline: string
  maxScore: number
}

export type TaskStatusType = "DINILAI" | "KUMPUL" | "BELUM" | "TERLAMBAT"

export interface TaskGradeRecord {
  score: number | null
  status: TaskStatusType
  catatan?: string
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

export function TugasTable({ kelasCode = "9a" }: { kelasCode?: string } = {}) {
  const router = useRouter()
  const [students, setStudents] = useState<StudentBase[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Listen for data updates & fetch from Supabase
  useEffect(() => {
    let isMounted = true
    async function loadFromSupabase() {
      try {
        const [supStudents, supExclusions, supTasks, supGrades] = await Promise.all([
          studentService.getStudentsByClass(kelasCode),
          tugasService.getTugasExclusions(kelasCode),
          tugasService.getTasksByClass(kelasCode),
          tugasService.getGradesByClass(kelasCode),
        ])

        if (isMounted) {
          if (supStudents.length > 0) {
            setStudents(
              supStudents
                .filter((s) => !supExclusions.includes(s.nisn))
                .map((s, idx) => ({
                  noAbs: s.noAbs || (idx + 1),
                  nisn: s.nisn,
                  nama: s.nama,
                  gender: s.gender,
                }))
            )
          } else {
            setStudents(defaultStudents)
          }

          // 2. Load and merge tasks from LocalStorage & Supabase
          let localTasks: TaskDefinition[] = []
          try {
            const storedTasks = localStorage.getItem("saguru_tasks_list")
            if (storedTasks) {
              localTasks = JSON.parse(storedTasks)
            }
          } catch (err) {}

          const supTasksMapped: TaskDefinition[] = (supTasks || []).map((t) => ({
            id: t.id,
            title: t.title,
            mapel: t.mapel,
            kelasCode: t.kelas_code,
            deadline: "23:59 WIB",
            maxScore: 100,
          }))

          const taskMap = new Map<string, TaskDefinition>()
          localTasks.forEach((t) => {
            const key = `${t.id}_${t.mapel}_${(t.kelasCode || kelasCode).toLowerCase()}`
            taskMap.set(key, t)
          })
          supTasksMapped.forEach((t) => {
            const key = `${t.id}_${t.mapel}_${(t.kelasCode || kelasCode).toLowerCase()}`
            taskMap.set(key, t)
          })

          const mergedTasks = Array.from(taskMap.values())
          if (mergedTasks.length > 0) {
            setTasks(mergedTasks)
          }

          if (Object.keys(supGrades).length > 0) {
            setGrades((prev) => {
              const updated = { ...prev }
              Object.keys(supGrades).forEach((k) => {
                updated[k] = {
                  score: supGrades[k].score,
                  status: (supGrades[k].status || "BELUM") as TaskStatusType,
                }
              })
              return updated
            })
          }
        }
      } catch (err) {
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    const handleUpdate = () => {
      try {
        const stored = localStorage.getItem("saguru_migrated_students")
        const deletedTugas = localStorage.getItem("saguru_tugas_deleted_nisns")
        const deletedMap = deletedTugas ? JSON.parse(deletedTugas) : {}
        const hiddenNisns: string[] = deletedMap[kelasCode?.toLowerCase()] || []

        if (stored) {
          const map = JSON.parse(stored)
          if (map[kelasCode?.toLowerCase()] && Array.isArray(map[kelasCode?.toLowerCase()]) && map[kelasCode?.toLowerCase()].length > 0) {
            const classStudents: StudentBase[] = map[kelasCode?.toLowerCase()]
            setStudents(classStudents.filter((s) => !hiddenNisns.includes(s.nisn)))
          } else {
            setStudents(defaultStudents)
          }
        } else {
          setStudents(defaultStudents)
        }
      } catch (err) {}
      loadFromSupabase()
    }

    handleUpdate()
    window.addEventListener("saguru-data-updated", handleUpdate)
    window.addEventListener("saguru-tasks-updated", handleUpdate)
    return () => {
      isMounted = false
      window.removeEventListener("saguru-data-updated", handleUpdate)
      window.removeEventListener("saguru-tasks-updated", handleUpdate)
    }
  }, [kelasCode])

  const [selectedMapel, setSelectedMapel] = useState("Matematika")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [isMounted, setIsMounted] = useState(false)

  // Tasks definitions state
  const [tasks, setTasks] = useState<TaskDefinition[]>([])

  // Grade matrix state
  const [grades, setGrades] = useState<Record<string, TaskGradeRecord>>({})

  // Listen for tasks updates across app
  useEffect(() => {
    setIsMounted(true)
    const handleTasksUpdate = () => {
      try {
        const stored = localStorage.getItem("saguru_tasks_list")
        if (stored) setTasks(JSON.parse(stored))
        const storedGrades = localStorage.getItem("saguru_grades_matrix")
        if (storedGrades) setGrades(JSON.parse(storedGrades))
      } catch (err) {}
    }
    handleTasksUpdate()
    window.addEventListener("saguru-tasks-updated", handleTasksUpdate)
    return () => window.removeEventListener("saguru-tasks-updated", handleTasksUpdate)
  }, [])

  // State Dialog Buat Tugas Baru
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDeadline, setNewDeadline] = useState("2026-08-28, 23:59 WIB")
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)

  // State Quick Grade Modal
  const [gradeModalTarget, setGradeModalTarget] = useState<{
    student: StudentBase
    task: TaskDefinition
  } | null>(null)
  const [inputScore, setInputScore] = useState<string>("")
  const [inputStatus, setInputStatus] = useState<TaskStatusType>("DINILAI")
  const [inputCatatan, setInputCatatan] = useState<string>("")

  // State Dialog Export
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf")
  const [exportWaliKelas, setExportWaliKelas] = useState("Devy, S.Pd.")
  const [exportKelas, setExportKelas] = useState(`Kelas ${kelasCode.toUpperCase()}`)
  const [exportTahun, setExportTahun] = useState("2025/2026")
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Persistent Multi-select Key
  const storageKey = `saguru_selected_tugas_${kelasCode.toLowerCase()}_${selectedMapel}`

  // State Dialog Hapus Tugas
  const [isDeleteTaskOpen, setIsDeleteTaskOpen] = useState(false)

  // Multi-select & Bulk Delete State
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedNisns, setSelectedNisns] = useState<string[]>([])
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

  // Load selection when kelasCode or selectedMapel changes
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
  }, [kelasCode, selectedMapel, storageKey])

  const saveSelectedNisns = (newSelected: string[]) => {
    setSelectedNisns(newSelected)
    try {
      localStorage.setItem(storageKey, JSON.stringify(newSelected))
    } catch (err) {}
  }

  // Current mapel tasks
  const mapelTasks = useMemo(() => {
    return tasks
      .filter((t) => t.mapel === selectedMapel && (!t.kelasCode || t.kelasCode === kelasCode.toLowerCase()))
      .sort((a, b) => a.id - b.id)
  }, [tasks, selectedMapel, kelasCode])

  // Effective Students with defaultStudents fallback
  const effectiveStudents = useMemo(() => {
    return students.length > 0 ? students : defaultStudents
  }, [students])

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return effectiveStudents.filter(
      (s) =>
        s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nisn.includes(searchQuery)
    )
  }, [effectiveStudents, searchQuery])

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
    const updatedStudents = students.filter((s) => !selectedNisns.includes(s.nisn))
    setStudents(updatedStudents)
    try {
      const deletedTugas = localStorage.getItem("saguru_tugas_deleted_nisns")
      const deletedMap = deletedTugas ? JSON.parse(deletedTugas) : {}
      const existingHidden: string[] = deletedMap[kelasCode.toLowerCase()] || []
      const newHidden = Array.from(new Set([...existingHidden, ...selectedNisns]))
      deletedMap[kelasCode.toLowerCase()] = newHidden
      localStorage.setItem("saguru_tugas_deleted_nisns", JSON.stringify(deletedMap))

      localStorage.removeItem(storageKey)
      window.dispatchEvent(new Event("saguru-tasks-updated"))
    } catch (err) {}

    // Sync exclusions to Supabase
    selectedNisns.forEach((id) => tugasService.addTugasExclusion(id, kelasCode))

    saveSelectedNisns([])
    setIsBulkDeleteOpen(false)
    setIsSelectionMode(false)
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * itemsPerPage
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage)

  // Helper: Get Grade for student and task
  const getGrade = (nisn: string, taskId: number): TaskGradeRecord => {
    const key = `${nisn}_${kelasCode.toLowerCase()}_${selectedMapel}_${taskId}`
    return grades[key] || { score: null, status: "BELUM" }
  }

  // Helper: Calculate Student Stats for selected mapel
  const calculateStudentStats = (nisn: string) => {
    if (mapelTasks.length === 0) return { totalGraded: 0, avg: 0, isPassed: false }

    let totalScore = 0
    let gradedCount = 0

    mapelTasks.forEach((t) => {
      const g = getGrade(nisn, t.id)
      if (g.status === "DINILAI" && g.score !== null) {
        totalScore += g.score
        gradedCount++
      }
    })

    const avg = gradedCount > 0 ? totalScore / gradedCount : 0
    return {
      totalGraded: gradedCount,
      avg,
      isPassed: gradedCount > 0 ? avg >= 75 : false,
    }
  }

  // Submit Buat Tugas Baru
  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (mapelTasks.length >= 30) {
      alert("Batas maksimal 30 tugas per mata pelajaran telah tercapai.")
      return
    }

    setIsSubmittingTask(true)
    const taskTitle = newTitle.trim() || `Tugas ${mapelTasks.length + 1}`

    try {
      // 1. Sync to Supabase first
      const createdTask = await tugasService.addTask(taskTitle, selectedMapel, kelasCode)

      const nextId = createdTask?.id || (mapelTasks.length > 0 ? Math.max(...mapelTasks.map((t) => t.id)) + 1 : 1)
      const newTaskObj: TaskDefinition = {
        id: nextId,
        mapel: selectedMapel,
        kelasCode: kelasCode.toLowerCase(),
        title: taskTitle,
        deadline: newDeadline.trim() || "2026-08-30, 23:59 WIB",
        maxScore: 100,
      }

      const updated = [...tasks, newTaskObj]
      setTasks(updated)
      try {
        localStorage.setItem("saguru_tasks_list", JSON.stringify(updated))
      } catch (err) {}
    } catch (err) {
      console.error("Error creating task:", err)
    } finally {
      setIsSubmittingTask(false)
      setNewTitle("")
      setIsAddTaskOpen(false)
    }
  }

  // Delete Task Handler (Opsi B)
  const handleDeleteTask = async (taskId: number) => {
    // 1. Delete from Supabase first to prevent race condition
    await tugasService.deleteTask(taskId, kelasCode)

    // 2. Remove task from local tasks state
    const updatedTasks = tasks.filter(
      (t) => !(t.id === taskId && t.mapel === selectedMapel && (!t.kelasCode || t.kelasCode === kelasCode.toLowerCase()))
    )
    setTasks(updatedTasks)
    try {
      localStorage.setItem("saguru_tasks_list", JSON.stringify(updatedTasks))
    } catch (err) {}

    // 3. Clean up associated grades from grades state
    const updatedGrades = { ...grades }
    Object.keys(updatedGrades).forEach((key) => {
      if (key.endsWith(`_${kelasCode.toLowerCase()}_${selectedMapel}_${taskId}`)) {
        delete updatedGrades[key]
      }
    })
    setGrades(updatedGrades)
    try {
      localStorage.setItem("saguru_grades_matrix", JSON.stringify(updatedGrades))
    } catch (err) {}

    // 4. Auto-close modal if no tasks remain for this mapel
    const remainingMapelTasks = updatedTasks.filter(
      (t) => t.mapel === selectedMapel && (!t.kelasCode || t.kelasCode === kelasCode.toLowerCase())
    )
    if (remainingMapelTasks.length === 0) {
      setIsDeleteTaskOpen(false)
    }
  }

  // Open Quick Grade Modal
  const handleOpenGradeModal = (student: StudentBase, task: TaskDefinition) => {
    const current = getGrade(student.nisn, task.id)
    setGradeModalTarget({ student, task })
    setInputScore(current.score !== null ? String(current.score) : "")
    setInputStatus(current.status)
    setInputCatatan(current.catatan || "")
  }

  // Save Quick Grade
  const handleSaveGrade = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!gradeModalTarget) return

    const { student, task } = gradeModalTarget
    const key = `${student.nisn}_${kelasCode.toLowerCase()}_${selectedMapel}_${task.id}`
    const parsedScore = inputScore.trim() !== "" ? Math.min(100, Math.max(0, Number(inputScore))) : null

    const updatedGrades = {
      ...grades,
      [key]: {
        score: parsedScore,
        status: inputStatus,
        catatan: inputCatatan.trim(),
      },
    }
    setGrades(updatedGrades)
    try {
      localStorage.setItem("saguru_grades_matrix", JSON.stringify(updatedGrades))
      window.dispatchEvent(new Event("saguru-tasks-updated"))
    } catch (err) {}

    // Sync to Supabase
    tugasService.saveGrade(task.id, student.nisn, kelasCode, parsedScore, inputStatus, selectedMapel)

    setGradeModalTarget(null)
  }

  // Export Submit
  const handleExportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formatLabel = exportFormat === "pdf" ? "PDF" : "Excel (.xlsx)"
    setToastMessage(`Mengunduh Rekap Nilai Tugas ${selectedMapel} (${formatLabel})...`)

    const exportData = students.map((s) => {
      const stats = calculateStudentStats(s.nisn)
      const scoresMap: Record<number, TaskGradeRecord> = {}
      mapelTasks.forEach((t) => {
        scoresMap[t.id] = getGrade(s.nisn, t.id)
      })

      return {
        noAbs: s.noAbs,
        nisn: s.nisn,
        nama: s.nama,
        gender: s.gender,
        scores: scoresMap,
        average: stats.avg,
        isPassed: stats.isPassed,
      }
    })

    try {
      if (exportFormat === "excel") {
        await exportTugasToExcel({
          students: exportData,
          mapel: selectedMapel,
          kelas: exportKelas,
          tahun: exportTahun,
          waliKelas: exportWaliKelas,
          totalTasks: mapelTasks.length,
        })
      } else {
        exportTugasToPDF({
          students: exportData,
          mapel: selectedMapel,
          kelas: exportKelas,
          tahun: exportTahun,
          waliKelas: exportWaliKelas,
          totalTasks: mapelTasks.length,
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
      {/* Action Bar: Search & Select Mapel on Left, Tambah Tugas & Export on Right */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left: Search Input & Select Mapel */}
        <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 sm:max-w-md">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
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

          {/* Dropdown Select Mapel */}
          <Select value={selectedMapel} onValueChange={(val) => { if (val) setSelectedMapel(val) }}>
            <SelectTrigger className="w-full sm:w-44 h-9 text-xs font-semibold bg-background shrink-0">
              <SelectValue placeholder="Pilih Mapel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Matematika">Matematika</SelectItem>
              <SelectItem value="IPA">IPA</SelectItem>
              <SelectItem value="Bahasa Indonesia">Bahasa Indonesia</SelectItem>
              <SelectItem value="Bahasa Inggris">Bahasa Inggris</SelectItem>
              <SelectItem value="IPS">IPS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Right: Tambah Tugas & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end shrink-0">
          {/* Popover Tambah Tugas Baru */}
          <Popover open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
            <PopoverTrigger render={
              <Button
                size="sm"
                className="h-9 px-3 text-xs sm:text-sm gap-1.5 bg-[#4274D9] hover:bg-[#3561bd] text-white cursor-pointer font-medium"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Tambah Tugas</span>
              </Button>
            } />
            <PopoverContent className="w-80 p-4 shadow-xl">
              <form onSubmit={handleCreateTask} className="space-y-3">
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm leading-none text-foreground">Buat Tugas Baru</h4>
                  <p className="text-xs text-muted-foreground">Mapel: <strong className="text-foreground">{selectedMapel}</strong> (Kelas {kelasCode.toUpperCase()})</p>
                </div>

                <FieldGroup className="space-y-2.5">
                  <Field>
                    <Label className="text-xs font-semibold">Tugas Ke-</Label>
                    <Input
                      value={`Tugas ${mapelTasks.length + 1}`}
                      disabled
                      className="h-9 text-xs bg-muted font-mono font-bold"
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="popover-task-title" className="text-xs font-semibold">Judul / Topik Tugas</Label>
                    <Input
                      id="popover-task-title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Masukkan judul tugas..."
                      className="h-9 text-xs"
                      required
                      autoFocus
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="popover-task-deadline" className="text-xs font-semibold">Deadline</Label>
                    <Input
                      id="popover-task-deadline"
                      value={newDeadline}
                      onChange={(e) => setNewDeadline(e.target.value)}
                      placeholder="Contoh: 2026-08-30, 23:59 WIB"
                      className="h-9 text-xs"
                      required
                    />
                  </Field>
                </FieldGroup>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                  <PopoverClose render={<Button variant="outline" size="sm" type="button" className="h-8 text-xs px-3">Batal</Button>} />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmittingTask}
                    className="h-8 text-xs px-3 bg-[#4274D9] hover:bg-[#3561bd] text-white cursor-pointer font-medium"
                  >
                    {isSubmittingTask ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Simpan</span>
                    )}
                  </Button>
                </div>
              </form>
            </PopoverContent>
          </Popover>

          {/* Dropdown Pilihan Kelas Binaan (Sebelah Tambah Tugas) */}
          {kelasCode.toLowerCase() !== "9a" && (
            <BinaanClassDropdown
              selectedKelas={kelasCode.toLowerCase()}
              onSelectKelas={(val) => router.push(`/tugas/${val}`)}
            />
          )}

          {/* Tombol Hapus Tugas */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 text-xs sm:text-sm gap-1.5 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer font-medium"
            onClick={() => setIsDeleteTaskOpen(true)}
            disabled={isMounted ? mapelTasks.length === 0 : true}
          >
            <Trash2 className="h-4 w-4" />
            <span>Hapus Tugas</span>
          </Button>

          {/* Tombol Export */}
          <Button
            variant="outline"
            className="h-9 px-3 text-xs sm:text-sm gap-2 cursor-pointer border-border hover:bg-accent"
            onClick={() => setIsExportOpen(true)}
            disabled={!isMounted || mapelTasks.length === 0 || students.length === 0}
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Main Matriks Table Container */}
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label={`Data Tugas Siswa Kelas ${kelasCode.toUpperCase()}`} className="min-w-[760px]">
            <Table.Header>
              {isSelectionMode && (
                <Table.Column className="w-10 text-center animate-in fade-in">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleToggleHeaderCheckbox}
                      aria-label="Pilih Semua Siswa Tagihan Tugas"
                      className="cursor-pointer"
                    />
                  </div>
                </Table.Column>
              )}
              <Table.Column className="text-foreground font-semibold">No Abs</Table.Column>
              <Table.Column className="text-foreground font-semibold">NISN</Table.Column>
              <Table.Column isRowHeader className="text-foreground font-semibold">Nama</Table.Column>
              <Table.Column className="text-foreground font-semibold">L/P</Table.Column>

              {/* Dynamic Task Header Columns */}
              {mapelTasks.map((task) => (
                <Table.Column key={task.id} className="text-foreground font-semibold text-center min-w-[85px]">
                  Tugas {task.id}
                </Table.Column>
              ))}

              {/* Summary Columns */}
              <Table.Column className="text-foreground font-semibold text-center">Rata-rata</Table.Column>
              <Table.Column className="text-foreground font-semibold text-center">Status</Table.Column>
            </Table.Header>

            <Table.Body>
              {isLoading ? (
                /* LOADING SKELETON STATE (Eliminates Initial Flash) */
                <Table.Row>
                  <Table.Cell colSpan={(isSelectionMode ? 7 : 6) + mapelTasks.length} className="h-64 text-center py-10">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                      <Loader2 className="h-7 w-7 text-primary animate-spin" />
                      <p className="text-xs text-muted-foreground font-medium">Memuat data tugas & siswa...</p>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ) : mapelTasks.length === 0 ? (
                /* EMPTY STATE (0 Task Exists for Selected Mapel) */
                <Table.Row>
                  <Table.Cell colSpan={6} className="h-64 text-center py-10">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">Belum Ada Tagihan Tugas</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Belum ada daftar tugas untuk mata pelajaran <strong className="text-foreground">{selectedMapel}</strong> di Kelas {kelasCode.toUpperCase()}. Silakan buat tugas baru.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsAddTaskOpen(true)}
                        className="h-8 text-xs bg-[#4274D9] hover:bg-[#3561bd] text-white gap-1.5 font-medium mt-1 cursor-pointer"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>Buat Tugas Pertama</span>
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ) : effectiveStudents.length === 0 ? (
                /* NO STUDENTS REGISTERED YET */
                <Table.Row>
                  <Table.Cell colSpan={(isSelectionMode ? 7 : 6) + mapelTasks.length} className="h-64 text-center py-10">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <UserPlus className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">
                          Belum Ada Data Siswa Terdaftar
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Belum ada data siswa terdaftar di Kelas <strong className="text-foreground">{kelasCode.toUpperCase()}</strong>. Silakan migrasi data siswa terlebih dahulu.
                        </p>
                      </div>
                      <Link href="/migrasi-data">
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-[#4274D9] hover:bg-[#3561bd] text-white gap-1.5 font-medium mt-1 cursor-pointer"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          <span>Migrasi Data Siswa</span>
                        </Button>
                      </Link>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ) : paginatedStudents.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={(isSelectionMode ? 7 : 6) + mapelTasks.length} className="text-center py-8 text-muted-foreground">
                    Tidak ada data siswa yang cocok dengan pencarian &quot;{searchQuery}&quot;
                  </Table.Cell>
                </Table.Row>
              ) : (
                paginatedStudents.map((student) => {
                  const stats = calculateStudentStats(student.nisn)

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
                      <Table.Cell className="font-medium">{student.nama}</Table.Cell>
                      <Table.Cell>{student.gender}</Table.Cell>

                      {/* Task Cells for student */}
                      {mapelTasks.map((task) => {
                        const grade = getGrade(student.nisn, task.id)

                        return (
                          <Table.Cell key={task.id} className="text-center p-2">
                            <button
                              type="button"
                              onClick={() => handleOpenGradeModal(student, task)}
                              className={cn(
                                "btn btn-xs w-full justify-center transition-all cursor-pointer font-semibold text-[11px]",
                                grade.status === "DINILAI" && grade.score !== null
                                  ? "btn-success"
                                  : grade.status === "KUMPUL"
                                  ? "btn-warning"
                                  : grade.status === "TERLAMBAT"
                                  ? "btn-info"
                                  : "btn-error opacity-40 hover:opacity-100"
                              )}
                              title={`Klik untuk menilai ${student.nama} (${task.title})`}
                            >
                              {grade.status === "DINILAI" && grade.score !== null ? (
                                <span>{grade.score}</span>
                              ) : grade.status === "KUMPUL" ? (
                                <span>Kumpul</span>
                              ) : grade.status === "TERLAMBAT" ? (
                                <span>Terlambat</span>
                              ) : (
                                <span>Belum</span>
                              )}
                            </button>
                          </Table.Cell>
                        )
                      })}

                      {/* Average */}
                      <Table.Cell className="text-center font-bold text-foreground">
                        {stats.totalGraded > 0 ? stats.avg.toFixed(1) : "-"}
                      </Table.Cell>

                      {/* Ketuntasan */}
                      <Table.Cell className="text-center">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded text-[11px] font-bold",
                            stats.isPassed
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {stats.isPassed ? "Tuntas" : "Belum"}
                        </span>
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
      {mapelTasks.length > 0 && filteredStudents.length > 0 && (
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

      {/* Quick Grade Modal */}
      <Dialog open={gradeModalTarget !== null} onOpenChange={(open) => { if (!open) setGradeModalTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveGrade} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                Penilaian Tugas: {gradeModalTarget?.task.title}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Siswa: <strong className="text-foreground">{gradeModalTarget?.student.nama}</strong> ({gradeModalTarget?.student.nisn})
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="space-y-3 py-1">
              <Field>
                <Label htmlFor="grade-input-score" className="text-xs font-semibold">Nilai (0 - 100)</Label>
                <Input
                  id="grade-input-score"
                  type="number"
                  min={0}
                  max={100}
                  value={inputScore}
                  onChange={(e) => setInputScore(e.target.value)}
                  placeholder="e.g. 90"
                  className="h-9 text-xs"
                />
              </Field>

              <Field>
                <Label className="text-xs font-semibold">Status Pengumpulan</Label>
                <RadioGroup
                  value={inputStatus}
                  onValueChange={(val) => setInputStatus(val as TaskStatusType)}
                  className="grid grid-cols-2 gap-2 mt-1"
                >
                  <div className="flex items-center gap-2 border border-border p-2 rounded-lg cursor-pointer">
                    <RadioGroupItem value="DINILAI" id="status-dinilai" />
                    <Label htmlFor="status-dinilai" className="text-xs font-medium cursor-pointer">Sudah Dinilai</Label>
                  </div>
                  <div className="flex items-center gap-2 border border-border p-2 rounded-lg cursor-pointer">
                    <RadioGroupItem value="KUMPUL" id="status-kumpul" />
                    <Label htmlFor="status-kumpul" className="text-xs font-medium cursor-pointer">Dikumpul (Belum Dinilai)</Label>
                  </div>
                  <div className="flex items-center gap-2 border border-border p-2 rounded-lg cursor-pointer">
                    <RadioGroupItem value="TERLAMBAT" id="status-terlambat" />
                    <Label htmlFor="status-terlambat" className="text-xs font-medium cursor-pointer">Terlambat</Label>
                  </div>
                  <div className="flex items-center gap-2 border border-border p-2 rounded-lg cursor-pointer">
                    <RadioGroupItem value="BELUM" id="status-belum" />
                    <Label htmlFor="status-belum" className="text-xs font-medium cursor-pointer">Belum Mengumpulkan</Label>
                  </div>
                </RadioGroup>
              </Field>

              <Field>
                <Label htmlFor="grade-input-catatan" className="text-xs font-semibold">Catatan Guru (Opsional)</Label>
                <Input
                  id="grade-input-catatan"
                  value={inputCatatan}
                  onChange={(e) => setInputCatatan(e.target.value)}
                  placeholder="e.g. Catatan perbaikan..."
                  className="h-9 text-xs"
                />
              </Field>
            </FieldGroup>

            <DialogFooter className="mt-2">
              <DialogClose render={<Button variant="outline" size="sm" type="button" className="h-8 text-xs px-3">Batal</Button>} />
              <Button type="submit" size="sm" className="h-8 text-xs px-3 bg-[#4274D9] hover:bg-[#3561bd] text-white cursor-pointer">
                Simpan Penilaian
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleExportSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <Download className="h-5 w-5 text-[#4274D9]" />
                <span>Export Rekap Tugas {selectedMapel}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Pilih format dokumen dan atur metadata rekap nilai tugas.
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
                    <RadioGroupItem value="pdf" id="export-pdf-tugas" />
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-red-500 shrink-0" />
                      <Label htmlFor="export-pdf-tugas" className="text-xs font-medium cursor-pointer">
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
                    <RadioGroupItem value="excel" id="export-excel-tugas" />
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                      <Label htmlFor="export-excel-tugas" className="text-xs font-medium cursor-pointer">
                        Excel (.xlsx)
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <FieldGroup className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <Label htmlFor="export-kelas-tugas" className="text-xs font-semibold">Kelas</Label>
                    <Input
                      id="export-kelas-tugas"
                      value={exportKelas}
                      onChange={(e) => setExportKelas(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="export-wali-tugas" className="text-xs font-semibold">Wali Kelas / Guru</Label>
                    <Input
                      id="export-wali-tugas"
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

      {/* Dialog Hapus Tugas (Opsi B) */}
      <Dialog open={isDeleteTaskOpen} onOpenChange={setIsDeleteTaskOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              <span>Hapus Tugas ({selectedMapel})</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              Pilih tugas yang ingin dihapus dari katalog <strong className="text-foreground">{selectedMapel}</strong> (Kelas {kelasCode.toUpperCase()}). Menghapus tugas akan menghapus kolom tugas dan nilainya, <strong>tanpa menghapus data siswa</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 max-h-[260px] overflow-y-auto">
            {mapelTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Tidak ada tugas terdaftar untuk mata pelajaran ini.</p>
            ) : (
              mapelTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">
                      Tugas {t.id} - {t.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Deadline: {t.deadline}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs px-3 bg-red-600 hover:bg-red-700 text-white cursor-pointer font-medium"
                    onClick={() => handleDeleteTask(t.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Hapus
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" type="button" className="h-8 text-xs">Tutup</Button>} />
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
