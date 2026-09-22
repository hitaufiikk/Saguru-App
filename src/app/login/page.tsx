import { GraduationCap } from "lucide-react"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <main className="flex min-h-svh w-full flex-col items-center justify-center gap-6 bg-gradient-to-br from-[#4274D9] via-[#3768c8] to-[#214b9c] dark:from-[#122c57] dark:via-[#102344] dark:to-[#0b172e] p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center text-xl font-semibold tracking-wide text-white">
          <div className="flex size-8 items-center justify-center rounded-md bg-white/15 text-white ring-1 ring-white/25">
            <GraduationCap className="size-5" aria-hidden="true" />
          </div>
          SAGURU
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
