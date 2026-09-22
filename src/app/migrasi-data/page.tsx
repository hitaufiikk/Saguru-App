import React from "react"
import { MigrasiDataForm } from "@/components/migrasi-card"

export default function MigrasiDataPage() {
  return (
    <div className="flex-1 flex flex-col justify-center p-3 sm:p-5 lg:p-6 overflow-hidden max-h-full">
      <div className="w-full max-w-[1400px] mx-auto">
        <MigrasiDataForm />
      </div>
    </div>
  )
}
