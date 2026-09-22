import assert from 'node:assert/strict'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-only'
globalThis.fetch = async () => { throw new Error('Network forbidden') }

async function main() {
  const { requireTeacherSession } = await import('../src/lib/services/authService')
  type Client = NonNullable<Parameters<typeof requireTeacherSession>[1]>
  let signouts = 0
  function client(allowed: boolean, failed = false) {
    return {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: allowed ? { user_id: 'teacher' } : null, error: failed ? new Error('offline') : null }) }) }) }),
      auth: {
        signOut: async (options: unknown) => { assert.deepEqual(options, { scope: 'local' }); signouts++; return { error: null } },
      },
    } as unknown as Client
  }
  await requireTeacherSession('teacher', client(true))
  assert.equal(signouts, 0)
  await assert.rejects(() => requireTeacherSession('teacher', client(false)), /belum diberi akses/)
  assert.equal(signouts, 1)
  await assert.rejects(() => requireTeacherSession('teacher', client(true, true)), /offline/)
  assert.equal(signouts, 1, 'Transient errors must not sign out an existing teacher')
  console.log('PASS: teacher authorization, unauthorized logout, network failure')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
