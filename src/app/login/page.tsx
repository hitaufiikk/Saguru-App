"use client"

import React from "react"
import { PinLoginCard } from "@/components/pin-login-card"

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#4274D9] dark:bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* PinLoginCard Component */}
      <PinLoginCard />
    </main>
  )
}
