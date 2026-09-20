-- Migration: Add teacher assignment fields to user_profile
-- Non-destructive: preserves existing rows, keys, and RLS policies.

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS mapel TEXT DEFAULT 'Matematika',
  ADD COLUMN IF NOT EXISTS kelas_ajar TEXT[] DEFAULT ARRAY['8I', '8H', '9A', '9B'],
  ADD COLUMN IF NOT EXISTS wali_kelas TEXT DEFAULT '9A',
  ADD COLUMN IF NOT EXISTS tahun_ajaran TEXT DEFAULT '2025/2026';

-- Ensure default profile has initial Bu Devy assignments if not set
UPDATE public.user_profile
SET
  mapel = COALESCE(mapel, 'Matematika'),
  kelas_ajar = COALESCE(kelas_ajar, ARRAY['8I', '8H', '9A', '9B']),
  wali_kelas = COALESCE(wali_kelas, '9A'),
  tahun_ajaran = COALESCE(tahun_ajaran, '2025/2026')
WHERE id = 'teacher_profile';

-- Ensure table permissions and RLS policies for application access
GRANT ALL ON TABLE public.user_profile TO anon, authenticated, service_role;
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access user_profile" ON public.user_profile;
CREATE POLICY "Public Access user_profile" ON public.user_profile FOR ALL USING (true) WITH CHECK (true);
