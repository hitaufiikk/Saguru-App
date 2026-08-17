"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RekapTugasPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/tugas/9a")
  }, [router])

  return null
}
