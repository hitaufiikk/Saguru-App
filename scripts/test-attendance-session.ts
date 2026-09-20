import assert from 'node:assert/strict'
import { createSessionAccessGate } from '../src/lib/session-access'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.invalid'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

async function main() {
  const gate = createSessionAccessGate()
  const first = gate.begin('teacher')
  assert.equal(first.keepMounted, false)
  first.resolve(true)
  assert.equal(gate.begin('teacher').keepMounted, true, 'refresh must retain forms')
  const old = gate.begin('teacher')
  const other = gate.begin('other')
  assert.equal(other.keepMounted, false)
  assert.equal(old.resolve(true), false, 'old verification cannot authorize a different account')
  other.resolve(true)
  gate.begin(null)
  assert.equal(gate.begin('other').keepMounted, false, 'logout resets access')
  gate.begin('teacher').resolve(true)
  gate.begin('teacher').resolve(false)
  assert.equal(gate.begin('teacher').keepMounted, false, 'revoked permission closes access')
  const stale = gate.begin('teacher')
  gate.invalidate()
  assert.equal(stale.resolve(true), false)

  const { presensiService } = await import('../src/lib/services/presensiService')
  function mock(data: unknown, error: unknown = null) {
    const filters: unknown[][] = []
    const chain = { select: () => chain, eq: (...args: unknown[]) => { filters.push(args); return chain }, then: (resolve: (r: unknown) => unknown) => Promise.resolve(resolve({ data, error })) }
    return { filters, client: { from: () => chain } as unknown as Parameters<typeof presensiService.getPresensiByClass>[2] }
  }
  let m = mock([])
  assert.deepEqual(await presensiService.getPresensiByClass('8I', '2026-09-19', m.client), {})
  assert.deepEqual(m.filters, [['kelas_code', '8i'], ['tanggal_presensi', '2026-09-19']])
  m = mock(null, { message: 'offline' })
  await assert.rejects(presensiService.getPresensiByClass('8i', '2026-09-19', m.client))
  m = mock([{ nisn: '001', status: 'SAKIT', alasan_dispen: null }])
  assert.equal((await presensiService.getPresensiByClass('8i', '2026-09-19', m.client))['001'].status, 'SAKIT')
  const { generateExcelWorkbook, generatePDFDoc } = await import('../src/lib/export-utils')
  const options = { students: [{ noAbs: 1, nisn: '001', nama: 'Test', gender: 'Laki-laki', status: 'BELUM_DICATAT' }], kelas: '8I', tahun: '2026/2027', waliKelas: 'Guru', tanggal: '2026-09-19' }
  const workbook = await generateExcelWorkbook(options)
  const values = JSON.stringify(workbook.worksheets[0].getSheetValues())
  assert.ok(values.includes('Belum dicatat'))
  assert.ok(values.includes('2026-09-19'))
  const pdf = generatePDFDoc(options)
  assert.ok(pdf.getNumberOfPages() >= 1)
  console.log('Attendance date/error handling and session stability assertions passed.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
