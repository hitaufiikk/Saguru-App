import assert from "node:assert/strict"

// Never load production credentials or perform network requests.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-only"
globalThis.fetch = async () => { throw new Error("Network forbidden in profile tests") }

async function main() {
  const { profileService } = await import("../src/lib/services/profileService")
  type Client = Parameters<typeof profileService.saveProfile>[1]
  const stored = { id: "teacher_profile", name: "Guru", avatar_url: "existing-avatar", wallpaper_url: "existing-wallpaper", mapel: "Matematika", kelas_ajar: ["9A"], wali_kelas: "9A", tahun_ajaran: "2026/2027" }
  function mock(options: { readError?: string; writeError?: string; noConfirmation?: boolean; absent?: boolean } = {}) {
    const writes: Record<string, unknown>[] = []
    const client = { from(table: string) {
      assert.equal(table, "user_profile")
      return {
        select() { return { eq() { return { maybeSingle: async () => ({ data: options.absent ? null : stored, error: options.readError ? { message: options.readError } : null }) } } } },
        upsert(rows: Record<string, unknown>[], config: unknown) {
          assert.deepEqual(config, { onConflict: "id" }); writes.push(...rows)
          return { select() { return { single: async () => ({ data: options.noConfirmation ? null : { id: "teacher_profile" }, error: options.writeError ? { message: options.writeError } : null }) } } }
        },
      }
    } } as unknown as Client
    return { client, writes }
  }
  const ok = mock()
  assert.equal((await profileService.saveProfile({ mapel: "IPA", kelasAjar: ["8I"], waliKelas: "", tahunAjaran: "2027/2028" }, ok.client)).success, true)
  assert.equal(ok.writes[0].avatar_url, "existing-avatar")
  assert.equal(ok.writes[0].wallpaper_url, "existing-wallpaper")
  assert.equal(ok.writes[0].mapel, "IPA")
  assert.deepEqual(ok.writes[0].kelas_ajar, ["8I"])
  assert.equal(ok.writes[0].wali_kelas, "")
  assert.equal(ok.writes[0].tahun_ajaran, "2027/2028")
  assert.equal(ok.writes[0].role_title, "Guru IPA")
  for (const readError of ["network failed", "column mapel does not exist"]) {
    const m = mock({ readError })
    assert.equal((await profileService.saveProfile({ name: "Changed" }, m.client)).success, false)
    assert.equal(m.writes.length, 0)
    await assert.rejects(() => profileService.getProfile(m.client))
  }
  for (const writeError of ["network failed", "column mapel does not exist", "row-level security denied"]) {
    const m = mock({ writeError })
    const result = await profileService.saveProfile({ name: "Changed" }, m.client)
    assert.equal(result.success, false)
    assert.equal(result.error, writeError)
    assert.equal(m.writes.length, 1, "No retry with an incomplete payload")
  }
  const missing = mock({ noConfirmation: true })
  assert.equal((await profileService.saveProfile({}, missing.client)).success, false)
  const first = mock({ absent: true })
  assert.equal((await profileService.saveProfile({ name: "First" }, first.client)).success, true)
  stored.kelas_ajar = []; stored.wali_kelas = ""
  const empty = await profileService.getProfile(mock().client)
  assert.deepEqual(empty?.kelasAjar, [])
  assert.equal(empty?.waliKelas, "")
  console.log("PASS: complete save, preserved images, read failure, missing schema, write failure, RLS denial, confirmation, first save, empty assignments")
}
main().catch(error => { console.error(error); process.exitCode = 1 })
