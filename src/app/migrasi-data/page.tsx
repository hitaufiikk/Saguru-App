import React from "react"
import { MigrasiDataForm } from "@/components/migrasi-card"

export default function MigrasiDataPage() {
  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="max-w-[1400px] mx-auto">
        <MigrasiDataForm />
      </div>
    </main>
  )
}
