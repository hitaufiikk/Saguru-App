"use client"

import { useEffect, useRef, useState, type ComponentProps, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { requireTeacherSession } from "@/lib/services/authService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({ className, ...props }: ComponentProps<"div">) {
  const router = useRouter()
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(true)
  const [mode, setMode] = useState<"login" | "forgot" | "reset">("login")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    let active = true
    const timeout = setTimeout(() => {
      if (!active) return
      active = false
      setChecking(false)
      setError("Pemeriksaan sesi terlalu lama. Periksa koneksi lalu muat ulang halaman sebelum mencoba masuk.")
    }, 15000)
    async function initialize() {
      const url = new URL(window.location.href)
      const recovery = url.searchParams.get("recovery") === "1"
      const failed = url.searchParams.has("error") || new URLSearchParams(url.hash.slice(1)).has("error")
      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (!active) return
        if (failed || sessionError) throw new Error("Proses masuk dibatalkan atau tautan sudah kedaluwarsa. Silakan coba lagi.")
        if (data.session) {
          await requireTeacherSession(data.session.user.id)
          if (!active) return
          if (recovery) setMode("reset")
          else router.replace("/")
        } else if (recovery) {
          throw new Error("Tautan pemulihan tidak valid atau kedaluwarsa. Minta tautan baru melalui Lupa kata sandi.")
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Tidak dapat memeriksa sesi. Coba muat ulang halaman.")
      } finally {
        if (active) {
          clearTimeout(timeout)
          setChecking(false)
          // Remove recovery errors and token fragments from the address bar.
          window.history.replaceState(null, "", "/login")
        }
      }
    }
    void initialize()
    return () => { active = false; clearTimeout(timeout) }
  }, [router])

  async function run(action: () => Promise<void>) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError("")
    setMessage("")
    try { await action() }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Terjadi kesalahan. Silakan coba lagi.") }
    finally { pending.current = false; setBusy(false) }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    void run(async () => {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(String(fields.get("email")).trim(), {
          redirectTo: `${window.location.origin}/login?recovery=1`,
        })
        if (error) throw new Error("Tautan belum dapat dikirim. Periksa koneksi atau coba lagi beberapa saat.")
        setMessage("Jika email terdaftar, tautan pemulihan akan dikirim. Periksa kotak masuk dan folder spam.")
        return
      }
      if (mode === "reset") {
        const password = String(fields.get("password"))
        if (password !== fields.get("confirmation")) throw new Error("Konfirmasi kata sandi tidak cocok.")
        const { data, error: userError } = await supabase.auth.getUser()
        if (userError || !data.user) throw new Error("Sesi pemulihan berakhir. Minta tautan pemulihan baru.")
        await requireTeacherSession(data.user.id)
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw new Error("Kata sandi belum tersimpan. Gunakan kata sandi yang kuat dan coba lagi.")
        router.replace("/")
        return
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: String(fields.get("email")).trim(), password: String(fields.get("password")),
      })
      if (error || !data.user) throw new Error("Gagal masuk. Periksa email, kata sandi, dan koneksi internet Anda.")
      await requireTeacherSession(data.user.id)
      router.replace("/")
    })
  }

  const disabled = busy || checking
  return <div className={cn("flex flex-col gap-3 sm:gap-5", className)} {...props}>
    <Card className="rounded-2xl border-blue-100 bg-white text-slate-900 shadow-xl shadow-blue-950/15 dark:border-blue-900 dark:bg-slate-900 dark:text-slate-100">
      <CardHeader className="text-center pb-2 pt-5 sm:pt-6">
        <CardTitle className="text-xl sm:text-2xl text-[#315fbd] dark:text-blue-300">{mode === "login" ? "Selamat datang di SAGURU" : mode === "forgot" ? "Lupa kata sandi?" : "Buat kata sandi baru"}</CardTitle>
        <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{mode === "login" ? "Masuk menggunakan akun guru Anda." : mode === "forgot" ? "Kami akan mengirim tautan pemulihan ke email Anda." : "Gunakan minimal 8 karakter untuk kata sandi baru."}</CardDescription>
      </CardHeader>
      <CardContent className="pb-5 sm:pb-6">
        <form onSubmit={submit} aria-busy={disabled}>
          <fieldset disabled={disabled}>
            <FieldGroup className="gap-3 sm:gap-3.5">
              {mode !== "reset" && <Field><FieldLabel htmlFor="email" className="text-xs sm:text-sm font-medium">Email</FieldLabel><Input id="email" name="email" type="email" placeholder="nama@gmail.com" autoComplete="username" className="h-10 sm:h-11 text-xs sm:text-sm" required /></Field>}
              {mode !== "forgot" && <Field>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <FieldLabel htmlFor="password" className="text-xs sm:text-sm font-medium">{mode === "reset" ? "Kata sandi baru" : "Kata sandi"}</FieldLabel>
                  {mode === "login" && <button type="button" className="text-xs sm:text-sm text-[#315fbd] underline-offset-4 hover:underline dark:text-blue-300" onClick={() => { setMode("forgot"); setError(""); setMessage("") }}>Lupa kata sandi?</button>}
                </div>
                <div className="relative"><Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "reset" ? "new-password" : "current-password"} minLength={mode === "reset" ? 8 : undefined} className="h-10 sm:h-11 pr-12 text-xs sm:text-sm" required />
                  <button type="button" className="absolute inset-y-0 right-0 px-3 flex items-center justify-center text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                </div>
              </Field>}
              {mode === "reset" && <Field><FieldLabel htmlFor="confirmation" className="text-xs sm:text-sm font-medium">Konfirmasi kata sandi</FieldLabel><Input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} required className="h-10 sm:h-11 text-xs sm:text-sm" /></Field>}
              {error && <p role="alert" className="text-xs sm:text-sm text-destructive">{error}</p>}
              {message && <p role="status" className="text-xs sm:text-sm text-muted-foreground">{message}</p>}
              <Field><Button type="submit" className="h-10 sm:h-11 w-full bg-[#4274D9] text-white hover:bg-[#315fbd] focus-visible:ring-blue-400/50 text-xs sm:text-sm font-medium">{disabled && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}{checking ? "Memeriksa sesi…" : busy ? "Memproses…" : mode === "login" ? "Masuk" : mode === "forgot" ? "Kirim tautan pemulihan" : "Simpan kata sandi"}</Button></Field>
              {mode !== "login" && <button type="button" className="text-xs sm:text-sm text-[#315fbd] underline-offset-4 hover:underline dark:text-blue-300 text-center" onClick={() => { setMode("login"); setError(""); setMessage("") }}>Kembali ke halaman masuk</button>}
            </FieldGroup>
          </fieldset>
        </form>
      </CardContent>
    </Card>
    <p className="px-6 text-center text-xs text-blue-100/80">Akses khusus akun guru yang telah diaktifkan.</p>
  </div>
}
