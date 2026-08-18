"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  REGEXP_ONLY_DIGITS,
} from "@/components/ui/input-otp"

import { supabase } from "@/lib/supabase"

export function PinLoginCard() {
  const router = useRouter()
  const [pinInput, setPinInput] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [validToken, setValidToken] = useState("123456")
  const [isSuccess, setIsSuccess] = useState(false)
  const [isShaking, setIsShaking] = useState(false)

  const [isTimeoutNotice, setIsTimeoutNotice] = useState(false)

  useEffect(() => {
    // Check if redirected due to session timeout
    if (typeof window !== "undefined" && window.location.search.includes("reason=timeout")) {
      setIsTimeoutNotice(true)
      localStorage.removeItem("saguru_remember_me")
    }

    // Check remembered state first (only if not timed out)
    try {
      const isRemembered = localStorage.getItem("saguru_remember_me") === "true"
      const isAuth = localStorage.getItem("saguru_is_authenticated") === "true"
      if (isRemembered && isAuth && !window.location.search.includes("reason=timeout")) {
        router.push("/")
        return
      }

      const savedToken = localStorage.getItem("saguru_app_token")
      if (savedToken) setValidToken(savedToken)

      // Fetch latest PIN from Supabase Cloud
      async function fetchCloudPin() {
        try {
          const { data, error } = await supabase
            .from("user_profile")
            .select("pin_code")
            .eq("id", "teacher_profile")
            .maybeSingle()

          if (!error && data?.pin_code) {
            setValidToken(data.pin_code)
            localStorage.setItem("saguru_app_token", data.pin_code)
          }
        } catch {
          // fallback to local token
        }
      }

      fetchCloudPin()
    } catch (err) {
      console.error("Gagal membaca token autentikasi:", err)
    }
  }, [router])

  const handlePinChange = (val: string) => {
    setPinInput(val)
    setErrorMsg(null)
    setIsShaking(false)
  }

  const validateAndSubmit = async (pinToValidate?: string) => {
    const pin = typeof pinToValidate === "string" ? pinToValidate : pinInput

    // Check against local or default
    let isMatch = pin === validToken || pin === "123456"

    // If not matching locally, check directly with Supabase Cloud
    if (!isMatch) {
      try {
        const { data } = await supabase
          .from("user_profile")
          .select("pin_code")
          .eq("id", "teacher_profile")
          .maybeSingle()

        if (data?.pin_code && data.pin_code === pin) {
          isMatch = true
          setValidToken(data.pin_code)
          localStorage.setItem("saguru_app_token", data.pin_code)
        }
      } catch {
        // ignore
      }
    }

    if (isMatch) {
      setIsSuccess(true)
      try {
        localStorage.setItem("saguru_is_authenticated", "true")
        localStorage.setItem("saguru_last_activity", Date.now().toString())
        if (rememberMe) {
          localStorage.setItem("saguru_remember_me", "true")
        } else {
          localStorage.removeItem("saguru_remember_me")
        }
      } catch {}

      setTimeout(() => {
        router.push("/")
      }, 500)
    } else {
      setIsShaking(true)
      setErrorMsg("PIN Akses salah! Masukkan 6 digit PIN yang benar.")
      
      // Reset input on error so user can re-type
      setTimeout(() => {
        setPinInput("")
        setIsShaking(false)
      }, 500)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pinInput.length === 6) {
      validateAndSubmit(pinInput)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 animate-in zoom-in-95 fade-in duration-200">
        <span className="loading loading-spinner loading-lg text-white dark:text-primary"></span>
        <p className="text-sm font-semibold text-white/90 dark:text-foreground/90 tracking-wide">Membuka Dashboard...</p>
      </div>
    )
  }

  return (
    <div className={`w-full max-w-[420px] border border-border/80 bg-card p-8 sm:p-9 rounded-3xl shadow-2xl space-y-6 relative z-10 transition-all ${isShaking ? "animate-bounce border-rose-500/60 ring-2 ring-rose-500/20" : ""}`}>
      
      {/* Header Title (Tanpa Ikon & Tanpa Profil) */}
      <div className="flex flex-col items-center text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Masuk Sistem SAGURU</h1>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-[300px]">
          Masukkan <strong className="text-foreground font-semibold">6 Digit PIN Akses</strong> Anda untuk membuka aplikasi.
        </p>
      </div>

      {/* Timeout Alert Notice */}
      {isTimeoutNotice && !errorMsg && !isSuccess && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold">Sesi Berakhir (30 Menit)</div>
            <div className="text-[11px] opacity-90">Tidak ada aktivitas selama 30 menit. Silakan masukkan PIN untuk melanjutkan.</div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && !isSuccess && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* PIN Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col items-center justify-center space-y-3.5">
          <InputOTP
            maxLength={6}
            value={pinInput}
            onChange={handlePinChange}
            pattern={REGEXP_ONLY_DIGITS}
            disabled={isSuccess}
            autoFocus
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} mask={showPin ? undefined : "•"} className="h-11 sm:h-12 w-11 sm:w-12 text-lg font-bold" />
              <InputOTPSlot index={1} mask={showPin ? undefined : "•"} className="h-11 sm:h-12 w-11 sm:w-12 text-lg font-bold" />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={2} mask={showPin ? undefined : "•"} className="h-11 sm:h-12 w-11 sm:w-12 text-lg font-bold" />
              <InputOTPSlot index={3} mask={showPin ? undefined : "•"} className="h-11 sm:h-12 w-11 sm:w-12 text-lg font-bold" />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={4} mask={showPin ? undefined : "•"} className="h-11 sm:h-12 w-11 sm:w-12 text-lg font-bold" />
              <InputOTPSlot index={5} mask={showPin ? undefined : "•"} className="h-11 sm:h-12 w-11 sm:w-12 text-lg font-bold" />
            </InputOTPGroup>
          </InputOTP>

          <div className="flex items-center justify-start w-full text-xs text-muted-foreground px-1 pt-1">
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer font-medium"
            >
              {showPin ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>Sembunyikan PIN</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  <span>Tampilkan PIN</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground font-medium">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-border text-[#4274D9] focus:ring-[#4274D9] h-4 w-4 cursor-pointer"
            />
            <span>Ingat Saya di Perangkat Ini</span>
          </label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={pinInput.length !== 6 || isSuccess}
          className="w-full h-11 text-xs sm:text-sm font-semibold bg-[#4274D9] hover:bg-[#3561bd] text-white cursor-pointer shadow-md disabled:opacity-50 gap-2 rounded-xl"
        >
          <span>Silakan klik masuk Bu Devy</span>
        </Button>
      </form>
    </div>
  )
}
