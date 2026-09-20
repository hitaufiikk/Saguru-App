"use client"

import { JadwalMengajarTable } from "@/components/jadwal-mengajar-table"
import Link from "next/link"

export default function JadwalPage() {
  return (
    <main className="min-h-screen bg-background text-foreground pt-3 sm:pt-6 pb-16 sm:pb-20 px-3 sm:px-6">
      <div className="max-w-5xl lg:max-w-6xl mx-auto space-y-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Beranda
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Data Jadwal Mengajar Bu Devy</span>
        </div>

        {/* Tabel Data Jadwal Mengajar */}
        <div className="rounded-xl border border-border bg-card p-3 sm:p-5 shadow-xs">
          <JadwalMengajarTable />
        </div>
      </div>
    </main>
  )
}
