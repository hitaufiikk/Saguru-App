"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { hasTeacherAccess } from "@/lib/services/authService"
import { supabase } from "@/lib/supabase"

export function PinLoginCard() {
  const router = useRouter()
  const pending = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    const fields = new FormData(event.currentTarget)
    pending.current = true
    setIsSaving(true)
    setError("")
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: String(fields.get("email")).trim(),
        password: String(fields.get("password")),
      })
      if (error) throw error
      if (!data.user || !await hasTeacherAccess(data.user.id)) {
        await supabase.auth.signOut()
        setError("Akun ini belum diberi akses guru. Hubungi pengelola aplikasi untuk aktivasi.")
        return
      }
      router.replace("/")
    } catch {
      setError("Gagal masuk. Periksa email, kata sandi, dan koneksi internet Anda.")
    } finally {
      pending.current = false
      setIsSaving(false)
    }
  }
  return (
    <div className="w-full max-w-[420px] rounded-3xl border bg-card p-8 shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Masuk SAGURU</h1>
        <p className="text-sm text-muted-foreground">Gunakan akun guru Anda. Sesi masuk tersimpan di perangkat ini.</p>
      </div>
      <form onSubmit={login}>
        <fieldset disabled={isSaving} className="space-y-4">
          <label className="block space-y-2"><span>Email</span><Input name="email" type="email" autoComplete="username" required /></label>
          <label className="block space-y-2"><span>Kata sandi</span><Input name="password" type="password" autoComplete="current-password" required /></label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">{isSaving ? "Memeriksa akun..." : "Masuk"}</Button>
        </fieldset>
      </form>
    </div>
  )
}
