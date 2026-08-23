"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Table as HeroTable } from "@heroui/react"
import { Search, Download, CheckCircle2, Calendar, Clock, MapPin, FileSpreadsheet, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

import { JADWAL_BU_DEVY, getEffectiveScheduleDay, ScheduleDayInfo } from "@/lib/data-jadwal"

export function JadwalMengajarTable() {
  const [selectedHari, setSelectedHari] = useState<string>("semua")
  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>("semua")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [dayInfo, setDayInfo] = useState<ScheduleDayInfo | null>(null)

  const [isExportOpen, setIsExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf")
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    setDayInfo(getEffectiveScheduleDay())
  }, [])

  // Filtered schedule list
  const filteredJadwal = useMemo(() => {
    return JADWAL_BU_DEVY.filter((item) => {
      const matchHari = selectedHari === "semua" || item.hari.toLowerCase() === selectedHari.toLowerCase()
      const matchKelas = selectedKelasFilter === "semua" || item.kelas.toLowerCase() === selectedKelasFilter.toLowerCase()
      const matchQuery =
        item.mapel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kelas.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ruangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.hari.toLowerCase().includes(searchQuery.toLowerCase())

      return matchHari && matchKelas && matchQuery
    })
  }, [selectedHari, selectedKelasFilter, searchQuery])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredJadwal.length / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * itemsPerPage
  const paginatedJadwal = filteredJadwal.slice(startIndex, startIndex + itemsPerPage)

  const handleExportSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formatLabel = exportFormat === "pdf" ? "PDF" : "Excel (.xlsx)"
    setToastMessage(`Mengunduh Jadwal Mengajar Bu Devy (${formatLabel})...`)
    setIsExportOpen(false)
    setTimeout(() => setToastMessage(null), 4000)
  }

  return (
    <div className="space-y-4 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Banner Info Status Hari Libur / Mendatang - Clean Simple Notice */}
      {dayInfo?.isUpcoming && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
          <Calendar className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong className="text-foreground">Info Kalender &amp; Status Libur:</strong> {dayInfo.statusMessage || `Hari ini adalah hari libur sekolah. Menampilkan Jadwal Mengajar Tatap Muka Mendatang (Hari ${dayInfo.dayName}).`}
          </span>
        </div>
      )}

      {/* Action Bar: Search & Dropdowns on Left, Export on Right */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
        {/* Left: Search Bar & Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] sm:max-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Cari mapel, kelas, atau ruangan..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9 h-9 text-xs sm:text-sm bg-background border-border"
            />
          </div>

          {/* Filter Dropdown Hari */}
          <Select value={selectedHari} onValueChange={(val) => { if (val) { setSelectedHari(val); setCurrentPage(1); } }}>
            <SelectTrigger className="w-28 sm:w-32 h-9 text-xs font-semibold bg-background">
              <SelectValue placeholder="semua" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="semua">semua</SelectItem>
                <SelectItem value="senin">Senin</SelectItem>
                <SelectItem value="selasa">Selasa</SelectItem>
                <SelectItem value="rabu">Rabu</SelectItem>
                <SelectItem value="kamis">Kamis</SelectItem>
                <SelectItem value="jumat">Jumat</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Filter Dropdown Kelas */}
          <Select value={selectedKelasFilter} onValueChange={(val) => { if (val) { setSelectedKelasFilter(val); setCurrentPage(1); } }}>
            <SelectTrigger className="w-28 sm:w-32 h-9 text-xs font-semibold bg-background">
              <SelectValue placeholder="semua" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="semua">semua</SelectItem>
                <SelectItem value="9a">Kelas 9A</SelectItem>
                <SelectItem value="9b">Kelas 9B</SelectItem>
                <SelectItem value="8h">Kelas 8H</SelectItem>
                <SelectItem value="8i">Kelas 8I</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Right: Export Button */}
        <div className="flex items-center justify-end shrink-0">
          <Button
            variant="outline"
            className="h-9 px-3 text-xs sm:text-sm gap-2 cursor-pointer border-border hover:bg-accent font-medium"
            onClick={() => setIsExportOpen(true)}
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Table Container - Clean Plain Text without Colored Badges */}
      <HeroTable>
        <HeroTable.ScrollContainer>
          <HeroTable.Content aria-label="Jadwal Mengajar Bu Devy" className="min-w-[850px]">
            <HeroTable.Header>
              <HeroTable.Column className="text-foreground font-semibold">No</HeroTable.Column>
              <HeroTable.Column className="text-foreground font-semibold">Hari</HeroTable.Column>
              <HeroTable.Column className="text-foreground font-semibold">Jam Ke</HeroTable.Column>
              <HeroTable.Column className="text-foreground font-semibold">Waktu</HeroTable.Column>
              <HeroTable.Column className="text-foreground font-semibold">Kelas</HeroTable.Column>
              <HeroTable.Column className="text-foreground font-semibold">Mata Pelajaran</HeroTable.Column>
              <HeroTable.Column className="text-foreground font-semibold">Kategori</HeroTable.Column>
              <HeroTable.Column className="text-foreground font-semibold">Lokasi / Ruangan</HeroTable.Column>
              <HeroTable.Column className="text-foreground font-semibold text-center">Aksi Presensi</HeroTable.Column>
            </HeroTable.Header>

            <HeroTable.Body>
              {paginatedJadwal.length === 0 ? (
                <HeroTable.Row>
                  <HeroTable.Cell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Tidak ada jadwal mengajar yang cocok dengan pencarian.
                  </HeroTable.Cell>
                </HeroTable.Row>
              ) : (
                paginatedJadwal.map((item, idx) => (
                  <HeroTable.Row key={item.id} className={item.isBreak ? "bg-muted/10" : ""}>
                    <HeroTable.Cell className="font-medium text-xs text-foreground">{startIndex + idx + 1}</HeroTable.Cell>
                    <HeroTable.Cell className="font-bold text-xs text-foreground">{item.hari}</HeroTable.Cell>
                    <HeroTable.Cell className="font-mono text-xs text-muted-foreground">{item.jamKe}</HeroTable.Cell>
                    <HeroTable.Cell className="text-xs">
                      <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{item.waktu}</span>
                      </div>
                    </HeroTable.Cell>
                    {/* PLAIN CLEAN TEXT FOR KELAS (NO BADGE) */}
                    <HeroTable.Cell className="text-xs font-semibold text-foreground">
                      {item.isBreak || item.kelas === "-" ? (
                        <span className="text-muted-foreground font-mono">-</span>
                      ) : (
                        <span>{item.kelas}</span>
                      )}
                    </HeroTable.Cell>
                    <HeroTable.Cell className="font-semibold text-xs text-foreground">{item.mapel}</HeroTable.Cell>
                    {/* PLAIN CLEAN TEXT FOR KATEGORI (NO BADGE) */}
                    <HeroTable.Cell className="text-xs text-foreground">
                      <span>{item.kategori}</span>
                    </HeroTable.Cell>
                    <HeroTable.Cell className="text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span>{item.ruangan}</span>
                      </div>
                    </HeroTable.Cell>
                    <HeroTable.Cell className="text-center">
                      {item.isBreak || item.kelas === "-" || item.kelas === "Semua" ? (
                        <span className="text-muted-foreground text-xs font-mono">-</span>
                      ) : (
                        <Link
                          href={`/presensi/${item.kelas.toLowerCase()}`}
                          className="text-xs font-medium text-[#4274d9] hover:underline cursor-pointer"
                        >
                          Presensi {item.kelas}
                        </Link>
                      )}
                    </HeroTable.Cell>
                  </HeroTable.Row>
                ))
              )}
            </HeroTable.Body>
          </HeroTable.Content>
        </HeroTable.ScrollContainer>
      </HeroTable>

      {/* Pagination Footer */}
      {filteredJadwal.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
          <div>
            Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredJadwal.length)} dari {filteredJadwal.length} jadwal
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

      {/* Export Dialog */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleExportSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <Download className="h-5 w-5 text-[#4274D9]" />
                <span>Export Data Jadwal Mengajar</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Pilih format dokumen untuk mengunduh rekap jadwal mengajar Bu Devy.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExportFormat("pdf")}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                    exportFormat === "pdf"
                      ? "border-[#4274D9] bg-[#4274D9]/10 text-[#4274D9]"
                      : "border-border hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <FileText className="h-6 w-6" />
                  <span className="text-xs font-bold">Dokumen PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat("excel")}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                    exportFormat === "excel"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                      : "border-border hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <FileSpreadsheet className="h-6 w-6" />
                  <span className="text-xs font-bold">Excel (.xlsx)</span>
                </button>
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button">Batal</Button>} />
              <Button type="submit" className="bg-[#4274D9] hover:bg-[#3561bd] text-white">Unduh Jadwal</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
