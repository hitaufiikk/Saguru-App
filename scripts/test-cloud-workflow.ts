import assert from 'node:assert/strict'
import { schoolDate } from '../src/lib/school-date'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.invalid'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

async function main() {
  const { hasTeacherAccess } = await import('../src/lib/services/authService')
  const { tugasService } = await import('../src/lib/services/tugasService')
  const { dashboardService } = await import('../src/lib/services/dashboardService')
  type Reply = { data?: unknown; error?: { message: string } | null; count?: number }
  function mock(replies: Reply[]) {
    const calls: { method: string; args: unknown[] }[] = []
    const client = {
      from(table: string) {
        calls.push({ method: 'from', args: [table] })
        const reply = replies.shift()
        const chain: Record<string, unknown> = {}
        for (const method of ['select', 'eq', 'order', 'insert', 'upsert', 'single', 'maybeSingle']) {
          chain[method] = (...args: unknown[]) => { calls.push({ method, args }); return chain }
        }
        chain.then = (resolve: (value: Reply | undefined) => unknown) => Promise.resolve(resolve(reply))
        return chain
      },
    }
    return { client: client as unknown as Parameters<typeof tugasService.getTasksByClass>[1], calls }
  }
  let m = mock([{ data: { user_id: 'teacher' } }])
  assert.equal(await hasTeacherAccess('teacher', m.client), true)
  m = mock([{ data: null }])
  assert.equal(await hasTeacherAccess('stranger', m.client), false)
  m = mock([{ error: { message: 'offline' } }])
  await assert.rejects(hasTeacherAccess('teacher', m.client))
  m = mock([{ data: [], error: null }])
  assert.deepEqual(await tugasService.getTasksByClass('8I', m.client), [])
  assert.deepEqual(m.calls.find(c => c.method === 'eq')?.args, ['kelas_code', '8i'])
  m = mock([{ error: { message: 'offline' } }])
  await assert.rejects(tugasService.getTasksByClass('8i', m.client))
  m = mock([{ data: { id: 41, title: 'Aljabar', mapel: 'Matematika', kelas_code: '8i', deadline: 'Besok' } }])
  assert.equal((await tugasService.addTask('Aljabar', 'Matematika', '8I', 'Besok', m.client))?.id, 41)
  assert.equal((m.calls.find(c => c.method === 'insert')?.args[0] as { deadline: string }[])[0].deadline, 'Besok')
  m = mock([{ data: { id: 'grade-1' } }])
  await tugasService.saveGrade(41, '0012', '8I', 0, 'DINILAI', 'Matematika', ' Ulangi ', m.client)
  const upsert = m.calls.find(c => c.method === 'upsert')!
  assert.deepEqual(upsert.args[1], { onConflict: 'task_id,nisn' })
  assert.equal((upsert.args[0] as { catatan: string }).catatan, 'Ulangi')
  assert.equal((upsert.args[0] as { score: number }).score, 0)
  assert.equal(m.calls.some(c => c.method === 'delete'), false)
  m = mock([{ error: { message: 'denied' } }])
  await assert.rejects(tugasService.saveGrade(41, '0012', '8i', 90, 'DINILAI', 'Matematika', '', m.client))
  m = mock([])
  await assert.rejects(tugasService.saveGrade(41, '0012', '8i', NaN, 'DINILAI', 'Matematika', '', m.client))
  assert.equal(m.calls.length, 0)
  m = mock([{ data: [{ task_id: 41, nisn: '0012', score: 0, status: 'DINILAI', mapel: 'Matematika', catatan: 'Ulangi' }] }])
  assert.deepEqual((await tugasService.getGradesByClass('8i', m.client))['0012_8i_Matematika_41'], { score: 0, status: 'DINILAI', catatan: 'Ulangi' })
  m = mock([{ data: [{ nisn: '0012', kelas_code: '8i' }, { nisn: '0013', kelas_code: '8i' }] }, { data: [{ nisn: '0012', kelas_code: '8i', status: 'HADIR' }, { nisn: 'deleted', kelas_code: '8i', status: 'HADIR' }] }])
  assert.deepEqual(await dashboardService.attendance(m.client, '2026-09-19'), { total: 2, recorded: 1, present: 1 })
  assert.ok(m.calls.some(c => c.method === 'eq' && c.args[0] === 'tanggal_presensi' && c.args[1] === '2026-09-19'))
  m = mock([{ data: [{ nisn: '0012', kelas_code: '8i' }] }, { data: [] }])
  assert.deepEqual(await dashboardService.attendance(m.client), { total: 1, recorded: 0, present: 0 })
  m = mock([{ count: 0 }])
  assert.equal(await dashboardService.taskCount(m.client), 0)
  assert.equal(schoolDate(new Date('2026-09-18T18:00:00Z')), '2026-09-19')
  assert.equal(schoolDate(new Date('2026-09-18T16:59:59Z')), '2026-09-18')
  console.log('Cloud workflow: all assertions passed (mock only, no database writes).')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
