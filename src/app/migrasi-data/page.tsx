import React from "react"
import { MigrasiDataForm } from "@/components/migrasi-card"

export default function MigrasiDataPage() {
  return (
    <div className="flex-1 flex flex-col px-3 pt-3 pb-5 sm:px-5 sm:pt-4 sm:pb-6 lg:px-6">
      <div className="w-full max-w-[1400px] mx-auto">
        <MigrasiDataForm />
      </div>
    </div>
  )
}
