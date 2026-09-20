import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock-test.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-test-key"

async function main() {
  const { createLatestRequest } = await import("../src/lib/latest-request")
  const { studentService } = await import("../src/lib/services/studentService")
  const { presensiService } = await import("../src/lib/services/presensiService")
  let passed = 0
  async function test(name: string, run: () => Promise<void>) {
    await run()
    passed++
    console.log(`PASS ${name}`)
  }
  await test("A late read cannot replace the list after a deletion or newer read", async () => {
    const gate = createLatestRequest()
    let resolveOld!: (rows: string[]) => void
    const oldRead = new Promise<string[]>((resolve) => { resolveOld = resolve })
    const oldIsCurrent = gate.begin()
    let visible = ["001"]
    const pending = oldRead.then((rows) => { if (oldIsCurrent()) visible = rows })
    gate.invalidate()
    visible = []
    const newIsCurrent = gate.begin()
    assert.equal(newIsCurrent(), true)
    resolveOld(["001"])
    await pending
    assert.deepEqual(visible, [])
    gate.invalidate()
    assert.equal(newIsCurrent(), false)
  })
  const records = [
    { nisn: "001", nama: "Siswa A", gender: "Perempuan", kelas_code: "9a" },
    { nisn: "002", nama: "Siswa B", gender: "Laki-laki", kelas_code: "9a" },
    { nisn: "003", nama: "Siswa C", gender: "Perempuan", kelas_code: "9b" },
  ]
  let rows = structuredClone(records)
  let failure = false
  let allowDelete = true
  let calls = 0
  // Stateful database double: the production services supply all filters.
  const client = {
    from(table: string) {
      assert.equal(table, "students")
      calls++
      const filters: Array<(row: typeof records[number]) => boolean> = []
      let deleting = false
      const query = {
        delete() { deleting = true; return query },
        eq(key: keyof typeof records[number], value: string) {
          filters.push((row) => row[key] === value); return query
        },
        in(key: keyof typeof records[number], values: string[]) {
          filters.push((row) => values.includes(row[key])); return query
        },
        select() { return query },
        order() { return query },
        then(resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) {
          if (failure) return Promise.resolve({ data: null, error: { message: "Network unavailable" } }).then(resolve, reject)
          const matches = rows.filter((row) => filters.every((filter) => filter(row)))
          const result = deleting && !allowDelete ? [] : matches
          if (deleting) rows = rows.filter((row) => !result.includes(row))
          return Promise.resolve({ data: result, error: null }).then(resolve, reject)
        },
      }
      return query
    },
  } as unknown as SupabaseClient

  await test("Single delete is persisted and other classes remain", async () => {
    const result = await studentService.deleteStudents(["001"], "9A", client)
    assert.equal(result.error, null)
    assert.deepEqual(result.deletedNisns, ["001"])
    assert.deepEqual((await studentService.getStudentsByClass("9a", client)).map((s) => s.nisn), ["002"])
    assert.equal(rows.find((s) => s.nisn === "003")?.kelas_code, "9b")
  })
  await test("Bulk delete cannot delete an identity in another class", async () => {
    rows = structuredClone(records)
    const result = await studentService.deleteStudents(["001", "002", "003"], "9a", client)
    assert.deepEqual(result.deletedNisns, ["001", "002"])
    assert.ok(result.error)
    assert.deepEqual(rows.map((s) => s.nisn), ["003"])
  })
  await test("Empty server results are successful, including an empty database", async () => {
    assert.deepEqual(await studentService.getStudentsByClass("9a", client), [])
    await studentService.deleteStudents(["003"], "9b", client)
    assert.deepEqual(await studentService.getAllStudents(client), [])
  })
  await test("Empty selection and class never issue delete requests", async () => {
    const before = calls
    assert.ok((await studentService.deleteStudents([], "9a", client)).error)
    assert.ok((await studentService.deleteStudents(["001"], "", client)).error)
    assert.equal(calls, before)
  })
  await test("Server failure preserves data and read failure differs from empty", async () => {
    rows = structuredClone(records)
    failure = true
    assert.ok((await studentService.deleteStudents(["001"], "9a", client)).error)
    assert.deepEqual(rows, records)
    await assert.rejects(studentService.getStudentsByClass("9a", client), /Network unavailable/)
    await assert.rejects(studentService.getAllStudents(client), /Network unavailable/)
    failure = false
  })
  await test("Zero affected rows is not reported as a successful delete", async () => {
    allowDelete = false
    const result = await studentService.deleteStudents(["001"], "9a", client)
    assert.ok(result.error)
    assert.deepEqual(result.deletedNisns, [])
    assert.deepEqual(rows, records)
    allowDelete = true
  })
  await test("Duplicate selected identities are deleted once", async () => {
    const result = await studentService.deleteStudents(["001", "001"], "9a", client)
    assert.equal(result.error, null)
    assert.deepEqual(result.deletedNisns, ["001"])
  })

  let studentExists = false
  let attendanceWrites = 0
  let attendanceError = false
  const attendanceClient = {
    from(table: string) {
      if (table === "students") {
        // No insert/upsert/delete methods: modifying master data fails this test.
        const lookup = {
          select() { return lookup },
          eq() { return lookup },
          async maybeSingle() { return { data: studentExists ? { nisn: "001" } : null, error: null } },
        }
        return lookup
      }
      assert.equal(table, "presensi")
      return { async upsert() {
        attendanceWrites++
        return { error: attendanceError ? { message: "Foreign key violation" } : null }
      } }
    },
  } as unknown as SupabaseClient
  await test("Attendance never recreates a deleted student", async () => {
    assert.equal(await presensiService.updateAttendance("001", "9a", "HADIR", "", "2026-09-18", attendanceClient), false)
    assert.equal(attendanceWrites, 0)
  })
  await test("Existing student attendance writes only to attendance", async () => {
    studentExists = true
    assert.equal(await presensiService.updateAttendance("001", "9a", "SAKIT", "", "2026-09-18", attendanceClient), true)
    assert.equal(attendanceWrites, 1)
  })
  await test("Deletion between lookup and attendance write returns failure", async () => {
    attendanceError = true
    assert.equal(await presensiService.updateAttendance("001", "9a", "HADIR", "", "2026-09-18", attendanceClient), false)
  })
  console.log(`${passed} tests passed; no production database used.`)
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
