"use client"

import { TugasTable } from "@/components/tugas-table"
import Link from "next/link"

export default function TugasBinaanPage() {
  return (
    <main className="flex-1 w-full bg-background text-foreground pt-3 sm:pt-6 pb-6 sm:pb-10 px-3 sm:px-6">
      <div className="max-w-5xl lg:max-w-6xl mx-auto space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Beranda
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Tagihan Tugas Kelas Binaan</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 sm:p-5 shadow-xs">
          <TugasTable kelasCode="9b" />
        </div>
      </div>
    </main>
  )
}
