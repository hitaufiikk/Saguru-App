import { supabase } from '@/lib/supabase'

export async function hasTeacherAccess(userId: string, client = supabase): Promise<boolean> {
  const { data, error } = await client.from('teacher_access').select('user_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.user_id === userId
}
