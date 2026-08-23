"use client"

import { Basic } from "@/components/heroui-table"
import Link from "next/link"

export default function Presensi9APage() {
  return (
    <main className="min-h-screen bg-background text-foreground pt-4 sm:pt-6 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl lg:max-w-6xl mx-auto space-y-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Beranda
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Presensi Siswa Kelas 9A</span>
        </div>

        {/* Tabel Presensi Siswa Format HeroUI Exact Layout */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <Basic kelasCode="9a" />
        </div>
      </div>
    </main>
  )
}
