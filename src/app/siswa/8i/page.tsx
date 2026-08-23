"use client"

import { ShadcnTableSiswa } from "@/components/shadcn-table-siswa"
import Link from "next/link"

export default function Siswa8IPage() {
  return (
    <main className="min-h-screen bg-background text-foreground pt-4 sm:pt-6 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl lg:max-w-6xl mx-auto space-y-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Beranda
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Data Siswa Kelas 8I</span>
        </div>

        {/* Tabel Data Siswa Format Shadcn UI Exact Layout */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <ShadcnTableSiswa kelasCode="8i" />
        </div>
      </div>
    </main>
  )
}
