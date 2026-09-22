"use client"

import * as React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
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
  UserPlus,
  Trash2,
  Edit,
  Info,
} from "lucide-react"

import { Table } from "@heroui/react"
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
import { cn } from "@/lib/utils"
import { exportTugasToExcel, exportTugasToPDF } from "@/lib/export-utils"
import { studentService } from "@/lib/services/studentService"
import { tugasService, parseTaskTitle, formatTaskTitle } from "@/lib/services/tugasService"

// Types
export interface StudentBase {
  noAbs: number
  nisn: string
  nama: string
  gender: string
  kontakOrtu?: string
}

export interface TaskDefinition {
  id: number // 1 to 30
  mapel: string
  kelasCode?: string
  title: string
  label?: string
  topic?: string
  deadline: string
  maxScore: number
}

export type TaskStatusType = "DINILAI" | "KUMPUL" | "BELUM" | "TERLAMBAT"

export interface TaskGradeRecord {
  score: number | null
  status: TaskStatusType
  catatan?: string
}

export function TugasTable({ kelasCode = "9a" }: { kelasCode?: string } = {}) {
  const router = useRouter()
  const [students, setStudents] = useState<StudentBase[]>([])
  const [selectedMapel, setSelectedMapel] = useState("Matematika")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const savingRef = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [hasLegacyData, setHasLegacyData] = useState(false)

  // Tasks definitions state
  const [tasks, setTasks] = useState<TaskDefinition[]>([])

  // Grade matrix state
  const [grades, setGrades] = useState<Record<string, TaskGradeRecord>>({})

  // Fetch from Supabase + localStorage on mount and when kelasCode changes
  useEffect(() => {
    let isMounted = true
    let request = 0

    const loadData = async () => {
      const current = ++request
      if (savingRef.current) return


      // Baca cache lokal di client setelah mount untuk mencegah hydration mismatch
      try {
        setHasLegacyData(Boolean(localStorage.getItem("saguru_tasks_list") && localStorage.getItem("saguru_tasks_list") !== "[]"))
        const stored = localStorage.getItem("saguru_migrated_students")
        if (stored && isMounted && current === request) {
          const map = JSON.parse(stored)
          if (map[kelasCode?.toLowerCase()] && Array.isArray(map[kelasCode?.toLowerCase()])) {
            setStudents(map[kelasCode?.toLowerCase()])
          }
        }
        const storedTasks = localStorage.getItem(`saguru_tasks_server_${kelasCode.toLowerCase()}`)
        if (storedTasks && isMounted && current === request) {
          const parsed = JSON.parse(storedTasks)
          if (Array.isArray(parsed)) {
            setTasks(
              parsed.map((t: TaskDefinition, idx: number) => {
                const pt = parseTaskTitle(t.title, idx + 1)
                return {
                  ...t,
                  label: t.label || pt.label,
                  topic: t.topic || pt.topic,
                }
              })
            )
          }
        }
        const storedGrades = localStorage.getItem(`saguru_grades_server_${kelasCode.toLowerCase()}`)
        if (storedGrades && isMounted && current === request) {
          setGrades(JSON.parse(storedGrades))
        }
      } catch { }

      try {
        const [dbStudents, dbTasks, dbGrades] = await Promise.all([
          studentService.getStudentsByClass(kelasCode),
          tugasService.getTasksByClass(kelasCode),
          tugasService.getGradesByClass(kelasCode),
        ])

        if (!isMounted || current !== request || savingRef.current) return
        if (isMounted) {
          if (dbStudents) {

            const formatted: StudentBase[] = dbStudents
              .map((s, index) => ({
                noAbs: s.noAbs || index + 1,
                nisn: s.nisn,
                nama: s.nama,
                gender: s.gender || "Laki-laki",
                kontakOrtu: s.kontak_ortu || "-",
              }))
            setStudents(formatted)
            try {
              const map = JSON.parse(localStorage.getItem("saguru_migrated_students") || "{}")
              const existing = new Map<string, StudentBase>((map[kelasCode.toLowerCase()] || []).map((s: StudentBase) => [s.nisn, s]))
              map[kelasCode.toLowerCase()] = formatted.map((s) => ({ ...existing.get(s.nisn), ...s }))
              localStorage.setItem("saguru_migrated_students", JSON.stringify(map))
            } catch { /* The server result remains authoritative if caching fails. */ }
          }

          if (dbTasks) {
            const formattedTasks: TaskDefinition[] = dbTasks.map((t, idx) => {
              const parsed = parseTaskTitle(t.title, idx + 1)
              return {
                id: t.id,
                mapel: t.mapel || "Matematika",
                kelasCode: t.kelas_code,
                title: t.title,
                label: t.label || parsed.label,
                topic: t.topic || parsed.topic,
                deadline: t.deadline || "",
                maxScore: 100,
              }
            })
            setTasks(formattedTasks)
            try {
              localStorage.setItem(`saguru_tasks_server_${kelasCode.toLowerCase()}`, JSON.stringify(formattedTasks))
            } catch (e) {}
          }

          if (dbGrades) {
            const formattedGrades: Record<string, TaskGradeRecord> = {}
            Object.keys(dbGrades).forEach((k) => {
              const g = dbGrades[k]
              formattedGrades[k] = {
                score: g.score,
                status: (g.status as TaskStatusType) || "BELUM",
                catatan: g.catatan || "",
              }
            })
            setGrades(formattedGrades)
            try {
              localStorage.setItem(`saguru_grades_server_${kelasCode.toLowerCase()}`, JSON.stringify(formattedGrades))
            } catch (e) {}
          }
        }
        setLoadError("")
        return
      } catch (err) {
        if (isMounted && current === request) setLoadError("Data server gagal dimuat. Data cache mungkin belum terbaru.")
        console.warn("Supabase tugas load fallback:", err)
      }

      if (!isMounted || current !== request || savingRef.current) return
      // Fallback
      try {
        const stored = localStorage.getItem("saguru_migrated_students")

        if (stored) {
          const map = JSON.parse(stored)
          if (map[kelasCode?.toLowerCase()] && Array.isArray(map[kelasCode?.toLowerCase()])) {
            const classStudents: StudentBase[] = map[kelasCode?.toLowerCase()]
            if (isMounted) setStudents(classStudents)
          }
        }
      } catch (err) {}
    }

    loadData()

    const handleUpdate = () => {
      loadData()
    }
    window.addEventListener("saguru-data-updated", handleUpdate)
    window.addEventListener("saguru-tasks-updated", handleUpdate)
    return () => {
      isMounted = false
      request++
      window.removeEventListener("saguru-data-updated", handleUpdate)
      window.removeEventListener("saguru-tasks-updated", handleUpdate)
    }
  }, [kelasCode, selectedMapel])

  // State Dialog Buat Tugas Baru
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [newTitle, setNewTitle] = useState("")
  const [newDeadline, setNewDeadline] = useState("")

  // State Dialog Daftar Tugas per Mapel
  const [isTaskListOpen, setIsTaskListOpen] = useState(false)

  // State Dialog Informasi Lebih Lanjut Tugas
  const [selectedDetailTask, setSelectedDetailTask] = useState<TaskDefinition | null>(null)

  // State Dialog Edit Tugas
  const [editingTask, setEditingTask] = useState<TaskDefinition | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editTitle, setEditTitle] = useState("")
  const [editDeadline, setEditDeadline] = useState("")

  // State Dialog Konfirmasi Hapus Tugas
  const [taskToDelete, setTaskToDelete] = useState<TaskDefinition | null>(null)

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

  // Current mapel tasks
  const mapelTasks = useMemo(() => {
    return tasks
      .filter((t) => t.mapel === selectedMapel && (!t.kelasCode || t.kelasCode === kelasCode.toLowerCase()))
      .sort((a, b) => a.id - b.id)
  }, [tasks, selectedMapel, kelasCode])

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nisn.includes(searchQuery)
    )
  }, [students, searchQuery])

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
    if (mapelTasks.length === 0) return { totalGraded: 0, avg: 0, isPassed: true }

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
      isPassed: avg >= 75,
    }
  }

  // Helper: Calculate Task Metrics for Detail Dialog
  const calculateTaskMetrics = (taskId: number) => {
    let dinilaiCount = 0
    let kumpulCount = 0
    let terlambatCount = 0
    let belumCount = 0
    let totalScore = 0
    let maxScore: number | null = null
    let minScore: number | null = null

    students.forEach((s) => {
      const g = getGrade(s.nisn, taskId)
      if (g.status === "DINILAI" && g.score !== null) {
        dinilaiCount++
        totalScore += g.score
        if (maxScore === null || g.score > maxScore) maxScore = g.score
        if (minScore === null || g.score < minScore) minScore = g.score
      } else if (g.status === "KUMPUL") {
        kumpulCount++
      } else if (g.status === "TERLAMBAT") {
        terlambatCount++
      } else {
        belumCount++
      }
    })

    const avgScore = dinilaiCount > 0 ? totalScore / dinilaiCount : null

    return {
      dinilaiCount,
      kumpulCount,
      terlambatCount,
      belumCount,
      totalStudents: students.length,
      avgScore,
      maxScore,
      minScore,
    }
  }

  // Submit Buat Tugas Baru
  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (savingRef.current) return
    if (mapelTasks.length >= 30) { alert("Batas maksimal 30 tugas per mata pelajaran."); return }
    savingRef.current = true
    setIsSaving(true)
    try {
      const taskLabel = newLabel.trim() || `Tugas ${mapelTasks.length + 1}`
      const formattedTitle = formatTaskTitle(taskLabel, newTitle)
      const saved = await tugasService.addTask(formattedTitle, selectedMapel, kelasCode, newDeadline)
      if (!saved) throw new Error("Tugas tidak tersimpan.")
      const updated: TaskDefinition[] = [
        ...tasks,
        {
          id: saved.id,
          title: saved.title,
          label: saved.label || taskLabel,
          topic: saved.topic || newTitle.trim() || taskLabel,
          mapel: saved.mapel,
          kelasCode: saved.kelas_code,
          deadline: saved.deadline || "",
          maxScore: 100,
        },
      ]
      setTasks(updated)
      try { localStorage.setItem(`saguru_tasks_server_${kelasCode.toLowerCase()}`, JSON.stringify(updated)) }
      catch { alert("Tugas tersimpan di server, tetapi cache browser gagal diperbarui.") }
      setNewTitle("")
      setNewLabel("")
      setNewDeadline("")
      setIsAddTaskOpen(false)
      setToastMessage(`Tugas "${taskLabel}" berhasil ditambahkan.`)
    } catch { alert("Gagal menyimpan tugas ke server. Form tetap tersedia untuk dicoba kembali.") }
    finally {
      savingRef.current = false
      setIsSaving(false)
      window.dispatchEvent(new Event("saguru-tasks-updated"))
    }
  }

  // Buka Modal Edit Tugas
  const handleOpenEditTask = (task: TaskDefinition) => {
    setEditingTask(task)
    setEditLabel(task.label || `Tugas ${task.id}`)
    setEditTitle(task.topic || task.title)
    setEditDeadline(task.deadline || "")
  }

  // Simpan Perubahan Edit Tugas
  const handleSaveEditTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingTask || savingRef.current) return
    savingRef.current = true
    setIsSaving(true)
    try {
      const taskLabel = editLabel.trim() || editingTask.label || `Tugas ${editingTask.id}`
      const formattedTitle = formatTaskTitle(taskLabel, editTitle)
      const ok = await tugasService.updateTask(editingTask.id, kelasCode, {
        title: formattedTitle,
        deadline: editDeadline,
      })
      if (!ok) throw new Error("Gagal mengupdate tugas.")
      const updated = tasks.map((t) => {
        if (t.id === editingTask.id) {
          return {
            ...t,
            title: formattedTitle,
            label: taskLabel,
            topic: editTitle.trim() || taskLabel,
            deadline: editDeadline.trim(),
          }
        }
        return t
      })
      setTasks(updated)
      try { localStorage.setItem(`saguru_tasks_server_${kelasCode.toLowerCase()}`, JSON.stringify(updated)) } catch {}

      if (selectedDetailTask && selectedDetailTask.id === editingTask.id) {
        setSelectedDetailTask({
          ...selectedDetailTask,
          title: formattedTitle,
          label: taskLabel,
          topic: editTitle.trim() || taskLabel,
          deadline: editDeadline.trim(),
        })
      }
      setEditingTask(null)
      setToastMessage(`Tugas "${taskLabel}" berhasil diperbarui.`)
    } catch {
      alert("Gagal memperbarui tugas di server.")
    } finally {
      savingRef.current = false
      setIsSaving(false)
      window.dispatchEvent(new Event("saguru-tasks-updated"))
    }
  }

  // Konfirmasi Hapus Tugas
  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete || savingRef.current) return
    savingRef.current = true
    setIsSaving(true)
    try {
      const ok = await tugasService.deleteTask(taskToDelete.id, kelasCode)
      if (!ok) throw new Error("Gagal menghapus tugas dari server.")
      const updated = tasks.filter((t) => t.id !== taskToDelete.id)
      setTasks(updated)
      try { localStorage.setItem(`saguru_tasks_server_${kelasCode.toLowerCase()}`, JSON.stringify(updated)) } catch {}

      if (selectedDetailTask && selectedDetailTask.id === taskToDelete.id) {
        setSelectedDetailTask(null)
      }
      setToastMessage(`Tugas "${taskToDelete.label || taskToDelete.title}" berhasil dihapus.`)
      setTaskToDelete(null)
    } catch {
      alert("Gagal menghapus tugas dari server.")
    } finally {
      savingRef.current = false
      setIsSaving(false)
      window.dispatchEvent(new Event("saguru-tasks-updated"))
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
  const handleSaveGrade = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!gradeModalTarget || savingRef.current) return
    const { student, task } = gradeModalTarget
    const score = inputScore.trim() === "" ? null : Number(inputScore)
    if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) {
      alert("Nilai harus antara 0 dan 100."); return
    }
    const key = `${student.nisn}_${kelasCode.toLowerCase()}_${task.mapel}_${task.id}`
    savingRef.current = true
    setIsSaving(true)
    try {
      await tugasService.saveGrade(task.id, student.nisn, kelasCode, score, inputStatus, task.mapel, inputCatatan)
      const updated = { ...grades, [key]: { score, status: inputStatus, catatan: inputCatatan.trim() } }
      setGrades(updated)
      try { localStorage.setItem(`saguru_grades_server_${kelasCode.toLowerCase()}`, JSON.stringify(updated)) }
      catch { alert("Nilai tersimpan di server, tetapi cache browser gagal diperbarui.") }
      setGradeModalTarget(null)
    } catch { alert("Gagal menyimpan nilai ke server. Isian tetap tersedia untuk dicoba kembali.") }
    finally {
      savingRef.current = false
      setIsSaving(false)
      window.dispatchEvent(new Event("saguru-tasks-updated"))
    }
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
          taskHeaders: mapelTasks.map((t, idx) => t.label || `T${idx + 1}`),
          taskIds: mapelTasks.map((t) => t.id),
        })
      } else {
        exportTugasToPDF({
          students: exportData,
          mapel: selectedMapel,
          kelas: exportKelas,
          tahun: exportTahun,
          waliKelas: exportWaliKelas,
          totalTasks: mapelTasks.length,
          taskHeaders: mapelTasks.map((t, idx) => t.label || `T${idx + 1}`),
          taskIds: mapelTasks.map((t) => t.id),
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
      {loadError && <p role="alert" className="text-sm text-destructive">{loadError}</p>}
      {hasLegacyData && <p className="text-sm text-muted-foreground">Data tugas lokal lama tetap disimpan di browser dan belum dipindahkan ke server. Daftar ini menampilkan tugas server.</p>}

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
        <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
          {/* Popover Tambah Tugas Baru */}
          <Popover
            open={isAddTaskOpen}
            onOpenChange={(open) => {
              if (!savingRef.current) {
                if (open && !newLabel) {
                  setNewLabel(`Tugas ${mapelTasks.length + 1}`)
                }
                setIsAddTaskOpen(open)
              }
            }}
          >
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
              <form onSubmit={handleCreateTask} className="space-y-3"><fieldset disabled={isSaving} className="space-y-3">
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm leading-none text-foreground">Buat Tugas Baru</h4>
                  <p className="text-xs text-muted-foreground">Mapel: <strong className="text-foreground">{selectedMapel}</strong> (Kelas {kelasCode.toUpperCase()})</p>
                </div>

                <FieldGroup className="space-y-2.5">
                  <Field>
                    <Label htmlFor="popover-task-label" className="text-xs font-semibold">Nomor / Label Tugas</Label>
                    <Input
                      id="popover-task-label"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder={`Contoh: Tugas ${mapelTasks.length + 1}, UH 1, PR 2`}
                      className="h-9 text-xs font-semibold font-mono"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Bebas diubah: Tugas 1, UH 1, PR 2, Proyek, dll.</p>
                  </Field>

                  <Field>
                    <Label htmlFor="popover-task-title" className="text-xs font-semibold">Judul / Topik Tugas</Label>
                    <Input
                      id="popover-task-title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Contoh: Operasi Aljabar, SPLDV..."
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
                  <Button type="submit" size="sm" className="h-8 text-xs px-3 bg-[#4274D9] hover:bg-[#3561bd] text-white cursor-pointer">
                    Simpan
                  </Button>
                </div>
              </fieldset></form>
            </PopoverContent>
          </Popover>

          {/* Tombol Katalog / Daftar Tugas */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsTaskListOpen(true)}
            className="h-9 px-3 text-xs sm:text-sm gap-1.5 border-border hover:bg-accent cursor-pointer font-medium"
          >
            <BookOpen className="h-4 w-4 text-[#4274D9]" />
            <span>Daftar Tugas</span>
            {mapelTasks.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#4274D9]/15 text-[#4274D9]">
                {mapelTasks.length}
              </span>
            )}
          </Button>

          {/* Dropdown Pilihan Kelas Binaan (Sebelah Tambah Tugas) */}
          {kelasCode.toLowerCase() !== "9a" && (
            <BinaanClassDropdown
              selectedKelas={kelasCode.toLowerCase()}
              onSelectKelas={(val) => router.push(`/tugas/${val}`)}
            />
          )}

          {/* Tombol Export */}
          <Button
            variant="outline"
            className="h-9 px-3 text-xs sm:text-sm gap-2 cursor-pointer border-border hover:bg-accent"
            onClick={() => setIsExportOpen(true)}
            disabled={mapelTasks.length === 0 || students.length === 0}
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Main Matriks Table Container */}
      <Table>
        <Table.ScrollContainer className="table-scroll-area max-h-[420px] sm:max-h-[480px] overflow-y-auto relative overscroll-contain rounded-lg border border-border/60">
          <Table.Content aria-label={`Data Tugas Siswa Kelas ${kelasCode.toUpperCase()}`} className="min-w-[760px]">
            <Table.Header className="sticky top-0 z-10 bg-card shadow-2xs">

              <Table.Column className="text-foreground font-semibold bg-card sticky top-0 z-10">No Abs</Table.Column>
              <Table.Column className="text-foreground font-semibold bg-card sticky top-0 z-10">NISN</Table.Column>
              <Table.Column isRowHeader className="text-foreground font-semibold bg-card sticky top-0 z-10">Nama</Table.Column>
              <Table.Column className="text-foreground font-semibold bg-card sticky top-0 z-10">L/P</Table.Column>

              {/* Dynamic Task Header Columns: Fleksibel & Dapat Diklik */}
              {mapelTasks.map((task, idx) => {
                const displayLabel = task.label || `Tugas ${idx + 1}`
                const displayTopic = task.topic || task.title
                return (
                  <Table.Column key={task.id} className="text-foreground font-semibold text-center min-w-[95px] p-1 bg-card sticky top-0 z-10">
                    <button
                      type="button"
                      onClick={() => setSelectedDetailTask(task)}
                      className="group w-full flex flex-col items-center justify-center gap-0.5 py-1 px-1.5 rounded-md hover:bg-muted/80 transition-colors cursor-pointer text-center"
                      title={`Klik untuk info rincian: ${displayLabel} - ${displayTopic}`}
                    >
                      <span className="text-xs font-bold text-foreground group-hover:text-[#4274D9] transition-colors truncate max-w-[95px]">
                        {displayLabel}
                      </span>
                      <span className="text-[10px] text-muted-foreground group-hover:text-[#4274D9]/80 flex items-center gap-0.5 font-normal">
                        <Info className="h-2.5 w-2.5" /> Info
                      </span>
                    </button>
                  </Table.Column>
                )
              })}

              {/* Summary Columns */}
              <Table.Column className="text-foreground font-semibold text-center bg-card sticky top-0 z-10">Rata-rata</Table.Column>
              <Table.Column className="text-foreground font-semibold text-center bg-card sticky top-0 z-10">Status</Table.Column>
            </Table.Header>

            <Table.Body>
              {mapelTasks.length === 0 ? (
                /* EMPTY STATE (0 Data Kalo Belum Ada Tugas - Tidak Tampilkan Baris Siswa) */
                <Table.Row>
                  <Table.Cell colSpan={6} className="h-64 text-center py-10">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">Belum Ada Tagihan Tugas</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Belum ada daftar tugas untuk mata pelajaran <strong className="text-foreground">{selectedMapel}</strong> di Kelas {kelasCode.toUpperCase()}. Silakan tambah tugas baru.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!newLabel) setNewLabel(`Tugas ${mapelTasks.length + 1}`)
                          setIsAddTaskOpen(true)
                        }}
                        className="h-8 text-xs bg-[#4274D9] hover:bg-[#3561bd] text-white gap-1.5 font-medium mt-1 cursor-pointer"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>Buat Tugas Pertama</span>
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ) : students.length === 0 ? (
                /* TASK EXISTS BUT NO STUDENTS REGISTERED YET */
                <Table.Row>
                  <Table.Cell colSpan={6 + mapelTasks.length} className="h-64 text-center py-10">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <UserPlus className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">
                          {mapelTasks.length} Tugas {selectedMapel} Terdaftar
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Tugas telah ditambahkan, tetapi belum ada data siswa terdaftar di Kelas <strong className="text-foreground">{kelasCode.toUpperCase()}</strong>. Silakan migrasi data siswa untuk mulai menginput nilai, atau kelola daftar tugas di bawah.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                        <Link href="/migrasi">
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-[#4274D9] hover:bg-[#3561bd] text-white gap-1.5 font-medium cursor-pointer"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            <span>Migrasi Data Siswa</span>
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsTaskListOpen(true)}
                          className="h-8 text-xs border-border hover:bg-accent gap-1.5 font-medium cursor-pointer"
                        >
                          <BookOpen className="h-3.5 w-3.5 text-[#4274D9]" />
                          <span>Kelola / Hapus Tugas ({mapelTasks.length})</span>
                        </Button>
                      </div>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ) : paginatedStudents.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={6 + mapelTasks.length} className="text-center py-8 text-muted-foreground">
                    Tidak ada data siswa yang cocok dengan pencarian &quot;{searchQuery}&quot;
                  </Table.Cell>
                </Table.Row>
              ) : (
                paginatedStudents.map((student) => {
                  const stats = calculateStudentStats(student.nisn)

                  return (
                    <Table.Row key={student.nisn}>

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
      <Dialog open={gradeModalTarget !== null} onOpenChange={(open) => { if (!open && !savingRef.current) setGradeModalTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveGrade} className="space-y-4"><fieldset disabled={isSaving} className="space-y-4">
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
          </fieldset></form>
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

      {/* Dialog Katalog / Daftar Tugas Mapel Tertentu */}
      <Dialog open={isTaskListOpen} onOpenChange={setIsTaskListOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <BookOpen className="h-5 w-5 text-[#4274D9]" />
              <span>Daftar Tugas {selectedMapel} - Kelas {kelasCode.toUpperCase()}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Daftar seluruh tagihan tugas pada mata pelajaran ini. Klik untuk melihat informasi rincian, edit, atau hapus tugas.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 space-y-3 pr-1">
            {mapelTasks.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <BookOpen className="h-6 w-6" />
                </div>
                <p className="text-xs text-muted-foreground">Belum ada tugas untuk mata pelajaran {selectedMapel}.</p>
                <Button
                  size="sm"
                  onClick={() => {
                    setIsTaskListOpen(false)
                    if (!newLabel) setNewLabel(`Tugas 1`)
                    setIsAddTaskOpen(true)
                  }}
                  className="h-8 text-xs bg-[#4274D9] hover:bg-[#3561bd] text-white gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Buat Tugas Baru</span>
                </Button>
              </div>
            ) : (
              mapelTasks.map((task, idx) => {
                const metrics = calculateTaskMetrics(task.id)
                const displayLabel = task.label || `Tugas ${idx + 1}`
                const displayTopic = task.topic || task.title

                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl border border-border bg-card hover:border-[#4274D9]/40 hover:shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[#4274D9]/15 text-[#4274D9]">
                          {displayLabel}
                        </span>
                        <h4 className="font-semibold text-sm text-foreground truncate">
                          {displayTopic}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>Deadline: <strong>{task.deadline || "Tidak ditentukan"}</strong></span>
                        </span>

                        {students.length > 0 && (
                          <span className="flex items-center gap-2 text-[11px]">
                            <span className="text-emerald-600 font-medium">
                              {metrics.dinilaiCount} Dinilai
                            </span>
                            <span>•</span>
                            <span className="text-amber-600 font-medium">
                              {metrics.kumpulCount} Kumpul
                            </span>
                            <span>•</span>
                            <span className="text-rose-600 font-medium">
                              {metrics.belumCount} Belum
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsTaskListOpen(false)
                          setSelectedDetailTask(task)
                        }}
                        className="h-8 px-2.5 text-xs gap-1.5 border-border hover:bg-accent cursor-pointer"
                      >
                        <Info className="h-3.5 w-3.5 text-[#4274D9]" />
                        <span>Detail Info</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditTask(task)}
                        className="h-8 px-2.5 text-xs gap-1 border-border hover:bg-accent cursor-pointer"
                        title="Edit Tugas"
                      >
                        <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTaskToDelete(task)}
                        className="h-8 px-2.5 text-xs gap-1 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                        title="Hapus Tugas"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Hapus</span>
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter className="mt-3 pt-3 border-t border-border flex flex-row items-center justify-between sm:justify-between w-full">
            <Button
              size="sm"
              onClick={() => {
                if (!newLabel) setNewLabel(`Tugas ${mapelTasks.length + 1}`)
                setIsAddTaskOpen(true)
              }}
              className="h-8 text-xs bg-[#4274D9] hover:bg-[#3561bd] text-white gap-1.5 cursor-pointer"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Tambah Tugas Baru</span>
            </Button>
            <DialogClose render={<Button variant="outline" size="sm" type="button" className="h-8 text-xs px-3">Tutup</Button>} />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Informasi Lebih Lanjut Tugas */}
      <Dialog open={selectedDetailTask !== null} onOpenChange={(open) => { if (!open) setSelectedDetailTask(null) }}>
        <DialogContent className="sm:max-w-xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6">
          {selectedDetailTask && (() => {
            const metrics = calculateTaskMetrics(selectedDetailTask.id)
            const displayLabel = selectedDetailTask.label || "Tugas"
            const displayTopic = selectedDetailTask.topic || selectedDetailTask.title
            const pendingStudents = students.filter((s) => {
              const g = getGrade(s.nisn, selectedDetailTask.id)
              return g.status === "BELUM" || g.status === "TERLAMBAT"
            })

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#4274D9]/15 text-[#4274D9]">
                      {displayLabel}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {selectedDetailTask.mapel} • Kelas {kelasCode.toUpperCase()}
                    </span>
                  </div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    {displayTopic}
                  </DialogTitle>
                  <DialogDescription className="text-xs flex items-center gap-1.5 pt-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Batas Waktu / Deadline: <strong>{selectedDetailTask.deadline || "Tidak ada batas waktu"}</strong></span>
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
                  {/* Metric Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col">
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Sudah Dinilai</span>
                      <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                        {metrics.dinilaiCount}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          ({metrics.totalStudents > 0 ? Math.round((metrics.dinilaiCount / metrics.totalStudents) * 100) : 0}%)
                        </span>
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col">
                      <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Kumpul (Belum Dinilai)</span>
                      <span className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                        {metrics.kumpulCount}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-sky-500/20 bg-sky-500/5 flex flex-col">
                      <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">Terlambat</span>
                      <span className="text-lg font-bold text-sky-700 dark:text-sky-300 mt-0.5">
                        {metrics.terlambatCount}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col">
                      <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">Belum Kumpul</span>
                      <span className="text-lg font-bold text-rose-700 dark:text-rose-300 mt-0.5">
                        {metrics.belumCount}
                      </span>
                    </div>
                  </div>

                  {/* Summary Nilai Kelas */}
                  {metrics.dinilaiCount > 0 && (
                    <div className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-muted-foreground">Rata-rata Nilai: </span>
                        <strong className="text-foreground text-sm">{metrics.avgScore?.toFixed(1)}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tertinggi: </span>
                        <strong className="text-foreground">{metrics.maxScore}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Terendah: </span>
                        <strong className="text-foreground">{metrics.minScore}</strong>
                      </div>
                    </div>
                  )}

                  {/* Section Siswa Belum Selesai / Terlambat */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                        <span>Siswa Perlu Tindak Lanjut ({pendingStudents.length})</span>
                      </h5>
                      <span className="text-[11px] text-muted-foreground">
                        {students.length > 0 ? `${students.length - pendingStudents.length} dari ${students.length} tuntas kumpul` : "0 siswa"}
                      </span>
                    </div>

                    {students.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 text-center">
                        Belum ada siswa terdaftar di kelas ini.
                      </p>
                    ) : pendingStudents.length === 0 ? (
                      <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        🎉 Semua siswa telah mengumpulkan tugas ini!
                      </div>
                    ) : (
                      <div className="border border-border rounded-lg divide-y divide-border/60 max-h-48 overflow-y-auto">
                        {pendingStudents.map((student) => {
                          const g = getGrade(student.nisn, selectedDetailTask.id)
                          return (
                            <div key={student.nisn} className="p-2 flex items-center justify-between gap-2 text-xs">
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate">
                                  {student.noAbs}. {student.nama}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  NISN: {student.nisn} {student.kontakOrtu && student.kontakOrtu !== "-" ? `• HP Ortu: ${student.kontakOrtu}` : ""}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold",
                                  g.status === "TERLAMBAT"
                                    ? "bg-sky-500/15 text-sky-600"
                                    : "bg-rose-500/15 text-rose-600"
                                )}>
                                  {g.status === "TERLAMBAT" ? "Terlambat" : "Belum Kumpul"}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenGradeModal(student, selectedDetailTask)}
                                  className="h-7 px-2 text-[11px] border-border hover:bg-accent cursor-pointer"
                                >
                                  Beri Nilai
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="mt-3 pt-3 border-t border-border flex flex-row items-center justify-between sm:justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditTask(selectedDetailTask)}
                      className="h-8 px-2.5 text-xs gap-1 border-border hover:bg-accent cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Edit Tugas</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTaskToDelete(selectedDetailTask)}
                      className="h-8 px-2.5 text-xs gap-1 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus</span>
                    </Button>
                  </div>
                  <DialogClose render={<Button variant="outline" size="sm" type="button" className="h-8 text-xs px-3">Tutup</Button>} />
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Tugas */}
      <Dialog open={editingTask !== null} onOpenChange={(open) => { if (!open && !savingRef.current) setEditingTask(null) }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveEditTask} className="space-y-4">
            <fieldset disabled={isSaving} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">
                  Edit Tagihan Tugas
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Ubah nomor/label, judul, atau tenggat waktu tugas.
                </DialogDescription>
              </DialogHeader>

              <FieldGroup className="space-y-3">
                <Field>
                  <Label htmlFor="edit-task-label" className="text-xs font-semibold">Nomor / Label Tugas</Label>
                  <Input
                    id="edit-task-label"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="Contoh: Tugas 1, UH 1, PR 2"
                    className="h-9 text-xs font-semibold font-mono"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Label yang tampil di header kolom matriks.</p>
                </Field>

                <Field>
                  <Label htmlFor="edit-task-title" className="text-xs font-semibold">Judul / Topik Tugas</Label>
                  <Input
                    id="edit-task-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Contoh: Operasi Aljabar..."
                    className="h-9 text-xs"
                    required
                  />
                </Field>

                <Field>
                  <Label htmlFor="edit-task-deadline" className="text-xs font-semibold">Deadline</Label>
                  <Input
                    id="edit-task-deadline"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    placeholder="Contoh: 2026-08-30, 23:59 WIB"
                    className="h-9 text-xs"
                    required
                  />
                </Field>
              </FieldGroup>

              <DialogFooter className="mt-3">
                <DialogClose render={<Button variant="outline" size="sm" type="button" className="h-8 text-xs px-3">Batal</Button>} />
                <Button type="submit" size="sm" className="h-8 text-xs px-3 bg-[#4274D9] hover:bg-[#3561bd] text-white cursor-pointer">
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Tugas */}
      <Dialog open={taskToDelete !== null} onOpenChange={(open) => { if (!open && !savingRef.current) setTaskToDelete(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-rose-600">
              <Trash2 className="h-5 w-5" />
              <span>Hapus Tagihan Tugas?</span>
            </DialogTitle>
            <DialogDescription className="text-xs space-y-2 pt-1 text-foreground block">
              <span className="block">
                Apakah Anda yakin ingin menghapus tugas <strong className="font-semibold">{taskToDelete?.label || taskToDelete?.title}</strong>?
              </span>
              <span className="block text-rose-600 text-[11px] bg-rose-500/10 p-2 rounded-md">
                Tindakan ini akan menghapus tugas beserta seluruh data nilai siswa yang terkait secara permanen dari server.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-2">
            <DialogClose render={<Button variant="outline" size="sm" type="button" className="h-8 text-xs px-3">Batal</Button>} />
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmDeleteTask}
              disabled={isSaving}
              className="h-8 text-xs px-3 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            >
              Ya, Hapus Tugas
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
