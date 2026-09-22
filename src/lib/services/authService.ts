import { supabase } from '@/lib/supabase'

export async function hasTeacherAccess(userId: string, client = supabase): Promise<boolean> {
  const { data, error } = await client.from('teacher_access').select('user_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.user_id === userId
}

/** Only the provisioned teacher may access application data. */
export async function requireTeacherSession(userId: string, client = supabase): Promise<void> {
  if (!await hasTeacherAccess(userId, client)) {
    await client.auth.signOut({ scope: 'local' })
    throw new Error('Akun ini belum diberi akses guru. Gunakan akun guru yang telah diaktifkan.')
  }
}
