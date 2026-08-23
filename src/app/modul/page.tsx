"use client"

import React, { useState } from "react"
import Link from "next/link"
import { FileText, Search, Download, Bookmark } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const MODULES = [
  { id: 1, title: "Modul Ajar Matematika BAB 1: Persamaan & Fungsi Kuadrat", mapel: "Matematika", kelas: "Kelas 9A", semester: "Genap 2025/2026" },
  { id: 2, title: "Modul Ajar Matematika BAB 2: Transformasi Geometri", mapel: "Matematika", kelas: "Kelas 9A", semester: "Genap 2025/2026" },
  { id: 3, title: "Modul Ajar Matematika BAB 3: Kesebangunan & Kekongruenan", mapel: "Matematika", kelas: "Kelas 9B", semester: "Genap 2025/2026" },
  { id: 4, title: "Lembar Kerja Siswa (LKS) Matematika Kelas 8", mapel: "Matematika", kelas: "Kelas 8H & 8I", semester: "Genap 2025/2026" },
]

export default function ModulPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredModules = MODULES.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.kelas.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-background text-foreground pt-4 sm:pt-6 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl lg:max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Beranda
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Modul &amp; Bahan Ajar</span>
        </div>

        {/* Header Title Card */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#4274D9]" />
              <h1 className="text-lg font-bold text-foreground">Modul &amp; Bahan Ajar Mengajar</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Koleksi lengkap modul ajar dan dokumen RPP/LKS matematika Bu Devy.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Cari modul atau materi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>
        </div>

        {/* Module List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredModules.map((mod) => (
            <div
              key={mod.id}
              className="p-4 rounded-xl border border-border bg-card shadow-xs hover:border-[#4274D9]/40 hover:shadow-md transition-all flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold bg-[#4274D9]/10 text-[#4274D9] border-[#4274D9]/30">
                    {mod.kelas}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-mono">{mod.semester}</span>
                </div>
                <h3 className="text-sm font-bold text-foreground leading-snug">
                  {mod.title}
                </h3>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Bookmark className="h-3 w-3 text-[#4274D9]" />
                  {mod.mapel}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alert(`Mengunduh berkas "${mod.title}"...`)}
                  className="h-7 text-xs px-2.5 gap-1.5 border-border hover:bg-accent cursor-pointer font-medium"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Unduh Modul</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
