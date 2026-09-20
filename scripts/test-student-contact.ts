import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock-test.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-test-key"

async function main() {
  const { studentService } = await import("../src/lib/services/studentService")
  let row: Record<string, unknown> = { nisn: "001", nama: "Siswa Uji", gender: "Perempuan", kelas_code: "8i" }
  let errorMessage: string | null = null
  let affected = true
  const client = {
    from(table: string) {
      assert.equal(table, "students")
      let updates: Record<string, unknown> | undefined
      let writing = false
      const query = {
        update(value: Record<string, unknown>) { writing = true; updates = value; return query },
        eq() { return query },
        select() { return query },
        order() { return query },
        async insert(values: Record<string, unknown>[]) {
          row = { ...values[0] }
          return { error: null }
        },
        then(resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) {
          if (errorMessage) return Promise.resolve({ data: null, error: { message: errorMessage } }).then(resolve, reject)
          if (writing && affected) {
            Object.entries(updates || {}).forEach(([key, value]) => { if (value !== undefined) row[key] = value })
          }
          return Promise.resolve({ data: writing && !affected ? [] : [{ ...row }], error: null }).then(resolve, reject)
        },
      }
      return query
    },
  } as unknown as SupabaseClient

  await studentService.updateStudent("001", { kontak_ortu: " 081234567890 " }, client)
  assert.equal((await studentService.getStudentsByClass("8i", client))[0].kontak_ortu, "081234567890")
  assert.equal((await studentService.getAllStudents(client))[0].kontak_ortu, "081234567890")
  console.log("PASS contact update survives both class and dashboard reads, including leading zero")

  await studentService.updateStudent("001", { nama: "Nama baru" }, client)
  assert.equal(row.kontak_ortu, "081234567890")
  console.log("PASS unrelated edits preserve existing contact")

  await studentService.updateStudent("001", { kontak_ortu: "" }, client)
  assert.equal(row.kontak_ortu, null)
  assert.equal((await studentService.getStudentsByClass("8i", client))[0].kontak_ortu, "")
  console.log("PASS clearing optional contact persists as null")

  await studentService.addStudent({ nisn: "002", nama: "Siswa Baru", gender: "Laki-laki", kelas_code: "8i", kontak_ortu: "+6281234567890" }, client)
  assert.equal(row.kontak_ortu, "+6281234567890")
  console.log("PASS new student contact preserves international prefix")

  const before = { ...row }
  errorMessage = "Column kontak_ortu does not exist"
  await assert.rejects(studentService.updateStudent("002", { kontak_ortu: "0811" }, client), /migrasi/)
  assert.deepEqual(row, before)
  console.log("PASS missing database column produces migration guidance instead of success")

  errorMessage = "Network unavailable"
  await assert.rejects(studentService.updateStudent("002", { kontak_ortu: "0811" }, client), /Network unavailable/)
  assert.deepEqual(row, before)
  console.log("PASS failed save preserves server data")

  errorMessage = null
  affected = false
  await assert.rejects(studentService.updateStudent("missing", { kontak_ortu: "0811" }, client), /belum tersimpan/)
  console.log("PASS zero affected rows is not reported as success")
  console.log("7 contact tests passed; no production database used.")
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
