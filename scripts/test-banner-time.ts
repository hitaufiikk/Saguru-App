import assert from "node:assert/strict"
import { getBannerTimeInfo } from "../src/lib/school-date"

function runBannerTimeTests() {
  console.log("=======================================================")
  console.log("🧪 PENGUJIAN OTOMATIS: LOGIKA WAKTU & BANNER AKADEMIK")
  console.log("=======================================================\n")

  let passedTests = 0
  const totalTests = 7

  // -------------------------------------------------------------
  // TEST 1: Kasus 30 Juni 2026 -> Genap, 2025/2026
  // -------------------------------------------------------------
  console.log("--- PENGUJIAN 1: Akhir Semester Genap (30 Juni 2026) ---")
  const dateJune30 = new Date("2026-06-30T10:15:30+07:00")
  const infoJune30 = getBannerTimeInfo(dateJune30)

  assert.equal(infoJune30.semester, "Semester Genap")
  assert.equal(infoJune30.tahunAjaran, "Tahun Ajaran 2025/2026")
  assert.equal(infoJune30.line1, "Semester Genap • Tahun Ajaran 2025/2026")
  assert.ok(infoJune30.line2.includes("30 Juni 2026"))
  assert.ok(infoJune30.line2.includes("10:15:30 WIB"))
  assert.ok(infoJune30.line2.startsWith("Selasa, 30 Juni 2026"))

  console.log("✅ 30 Juni 2026 terkonfirmasi: Semester Genap • Tahun Ajaran 2025/2026")
  console.log(`   Line 1: ${infoJune30.line1}`)
  console.log(`   Line 2: ${infoJune30.line2}`)
  passedTests++

  // -------------------------------------------------------------
  // TEST 2: Kasus 1 Juli 2026 -> Ganjil, 2026/2027
  // -------------------------------------------------------------
  console.log("\n--- PENGUJIAN 2: Awal Semester Ganjil & Tahun Ajaran Baru (1 Juli 2026) ---")
  const dateJuly1 = new Date("2026-07-01T08:00:00+07:00")
  const infoJuly1 = getBannerTimeInfo(dateJuly1)

  assert.equal(infoJuly1.semester, "Semester Ganjil")
  assert.equal(infoJuly1.tahunAjaran, "Tahun Ajaran 2026/2027")
  assert.equal(infoJuly1.line1, "Semester Ganjil • Tahun Ajaran 2026/2027")
  assert.ok(infoJuly1.line2.includes("1 Juli 2026"))
  assert.ok(infoJuly1.line2.includes("08:00:00 WIB"))
  assert.ok(infoJuly1.line2.startsWith("Rabu, 1 Juli 2026"))

  console.log("✅ 1 Juli 2026 terkonfirmasi: Semester Ganjil • Tahun Ajaran 2026/2027")
  console.log(`   Line 1: ${infoJuly1.line1}`)
  console.log(`   Line 2: ${infoJuly1.line2}`)
  passedTests++

  // -------------------------------------------------------------
  // TEST 3: Kasus 1 Januari 2027 -> Genap, 2026/2027
  // -------------------------------------------------------------
  console.log("\n--- PENGUJIAN 3: Semester Genap Tahun Baru Masehi (1 Januari 2027) ---")
  const dateJan1 = new Date("2027-01-01T00:00:00+07:00")
  const infoJan1 = getBannerTimeInfo(dateJan1)

  assert.equal(infoJan1.semester, "Semester Genap")
  assert.equal(infoJan1.tahunAjaran, "Tahun Ajaran 2026/2027")
  assert.equal(infoJan1.line1, "Semester Genap • Tahun Ajaran 2026/2027")
  assert.ok(infoJan1.line2.includes("1 Januari 2027"))
  assert.ok(infoJan1.line2.includes("00:00:00 WIB"))
  assert.ok(infoJan1.line2.startsWith("Jumat, 1 Januari 2027"))

  console.log("✅ 1 Januari 2027 terkonfirmasi: Semester Genap • Tahun Ajaran 2026/2027")
  console.log(`   Line 1: ${infoJan1.line1}`)
  console.log(`   Line 2: ${infoJan1.line2}`)
  passedTests++

  // -------------------------------------------------------------
  // TEST 4: Contoh Format Prompt (Senin, 21 September 2026 • 09:30:45 WIB)
  // -------------------------------------------------------------
  console.log("\n--- PENGUJIAN 4: Format Dua Baris Sesuai Contoh Prompt ---")
  const dateSep21 = new Date("2026-09-21T09:30:45+07:00")
  const infoSep21 = getBannerTimeInfo(dateSep21)

  assert.equal(infoSep21.line1, "Semester Ganjil • Tahun Ajaran 2026/2027")
  assert.equal(infoSep21.line2, "Senin, 21 September 2026 • 09:30:45 WIB")

  console.log("✅ Format dua baris tepat 100% sama dengan format permintaan:")
  console.log(`   Baris 1: ${infoSep21.line1}`)
  console.log(`   Baris 2: ${infoSep21.line2}`)
  passedTests++

  // -------------------------------------------------------------
  // TEST 5: Pergantian Otomatis Saat Melewati Tengah Malam (Midnight Rollover)
  // -------------------------------------------------------------
  console.log("\n--- PENGUJIAN 5: Transisi Pergantian Tengah Malam (Midnight Rollover) ---")
  // 30 Juni 23:59:59 -> 1 Juli 00:00:00
  const beforeMidnight = new Date("2026-06-30T23:59:59+07:00")
  const afterMidnight = new Date("2026-07-01T00:00:00+07:00")

  const infoBefore = getBannerTimeInfo(beforeMidnight)
  const infoAfter = getBannerTimeInfo(afterMidnight)

  assert.equal(infoBefore.semester, "Semester Genap")
  assert.equal(infoBefore.tahunAjaran, "Tahun Ajaran 2025/2026")
  assert.ok(infoBefore.line2.includes("23:59:59 WIB"))

  assert.equal(infoAfter.semester, "Semester Ganjil")
  assert.equal(infoAfter.tahunAjaran, "Tahun Ajaran 2026/2027")
  assert.ok(infoAfter.line2.includes("00:00:00 WIB"))

  console.log("✅ Transisi tengah malam otomatis memperbarui tanggal, semester, dan tahun ajaran.")
  passedTests++

  // -------------------------------------------------------------
  // TEST 6: Evaluasi Waktu Saat Ini di Zona Asia/Jakarta
  // -------------------------------------------------------------
  console.log("\n--- PENGUJIAN 6: Waktu Saat Ini di Zona Asia/Jakarta ---")
  const current = getBannerTimeInfo(new Date())
  assert.ok(current.line1.startsWith("Semester "))
  assert.ok(current.line1.includes("Tahun Ajaran "))
  assert.ok(current.line2.includes(" WIB"))
  console.log(`   Waktu Saat Ini: ${current.line1} | ${current.line2}`)
  passedTests++

  // -------------------------------------------------------------
  // TEST 7: Hapus Tanggal Hijriah dan Pasaran Jawa
  // -------------------------------------------------------------
  console.log("\n--- PENGUJIAN 7: Verifikasi Penghapusan Hijriah & Pasaran Jawa ---")
  assert.ok(!current.line1.includes("Hijriah"))
  assert.ok(!current.line1.includes("Kliwon") && !current.line1.includes("Legi") && !current.line1.includes("Pahing") && !current.line1.includes("Pon") && !current.line1.includes("Wage"))
  assert.ok(!current.line2.includes("Hijriah"))
  assert.ok(!current.line2.includes("Kliwon") && !current.line2.includes("Legi") && !current.line2.includes("Pahing") && !current.line2.includes("Pon") && !current.line2.includes("Wage"))

  console.log("✅ Tanggal Hijriah dan Pasaran Jawa terkonfirmasi bersih dan tidak lagi ditampilkan.")
  passedTests++

  console.log("\n=======================================================")
  console.log(`HASIL: SELURUH ${passedTests}/${totalTests} PENGUJIAN BANNER WAKTU LULUS 100%!`)
  console.log("=======================================================")
}

runBannerTimeTests()
