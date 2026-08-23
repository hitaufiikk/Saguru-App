"use client"

import { TugasTable } from "@/components/tugas-table"
import Link from "next/link"

export default function Tugas9BPage() {
  return (
    <main className="min-h-screen bg-background text-foreground pt-4 sm:pt-6 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl lg:max-w-6xl mx-auto space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Beranda
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Tagihan Tugas Kelas 9B</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <TugasTable kelasCode="9b" />
        </div>
      </div>
    </main>
  )
}
