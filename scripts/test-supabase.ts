import dotenv from "dotenv"
import path from "path"
import { createClient } from "@supabase/supabase-js"

// Load .env.local first, fallback to .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
dotenv.config({ path: path.resolve(process.cwd(), ".env") })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

async function checkSupabase() {
  console.log("\n🔍 Memeriksa Konfigurasi Koneksi Supabase...\n")

  if (!url || !key || url.includes("your-project-id") || key.includes("your-anon-public-key")) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi di file .env.local")
    console.log("\nPanduan pengisian:")
    console.log("1. Buka https://supabase.com/dashboard")
    console.log("2. Pilih Project Anda -> Masuk ke menu 'Project Settings' -> 'API'")
    console.log("3. Salin 'Project URL' ke NEXT_PUBLIC_SUPABASE_URL")
    console.log("4. Salin 'anon' 'public' Key ke NEXT_PUBLIC_SUPABASE_ANON_KEY")
    console.log("5. Simpan di file .env.local lalu jalankan kembali tes ini.\n")
    process.exit(1)
  }

  console.log(`📡 URL Target: ${url}`)
  console.log(`🔑 Anon Key: ${key.slice(0, 12)}...${key.slice(-6)}`)

  const supabase = createClient(url, key)

  const tables = [
    "students",
    "presensi",
    "tasks",
    "grades",
    "binaan_notes",
    "exclusions",
    "digital_books",
    "user_profile",
  ]

  console.log("\n📊 Menguji akses tabel database...")

  let hasError = false
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(1)
      if (error) {
        console.error(`  ❌ [${table}]: Gagal diakses (${error.message})`)
        hasError = true
      } else {
        console.log(`  ✅ [${table}]: Terhubung (berhasil query)`)
      }
    } catch (err: any) {
      console.error(`  ❌ [${table}]: Error (${err.message})`)
      hasError = true
    }
  }

  if (hasError) {
    console.log("\n⚠️ Beberapa tabel belum siap. Jika tabel belum dibuat, jalankan script 'supabase_schema.sql' di Supabase SQL Editor.")
  } else {
    console.log("\n🎉 SEMUA TABEL TERHUBUNG DAN SIAP DIGUNAKAN DENGAN SUPABASE! 🚀\n")
  }
}

checkSupabase().catch((err) => {
  console.error("Fatal error saat menguji Supabase:", err)
  process.exit(1)
})
