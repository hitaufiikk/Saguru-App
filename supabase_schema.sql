-- ====================================================================
-- SAGURU (SAG) - MASTER SUPABASE DATABASE SCHEMA
-- Jalankan script SQL ini di Supabase Dashboard -> SQL Editor -> Run
-- ====================================================================

-- 1. TABEL DATA SISWA (students)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nisn TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    gender TEXT DEFAULT 'Laki-laki',
    kelas_code TEXT NOT NULL,
    wali_kelas TEXT DEFAULT '-',
    status TEXT DEFAULT 'HADIR',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL PRESENSI HARIAN (presensi)
CREATE TABLE IF NOT EXISTS public.presensi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nisn TEXT NOT NULL,
    kelas_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'HADIR',
    alasan_dispen TEXT DEFAULT '',
    tanggal_presensi TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT presensi_nisn_tanggal_unique UNIQUE (nisn, tanggal_presensi)
);

-- 3. TABEL KATALOG TUGAS 9A (tasks)
CREATE TABLE IF NOT EXISTS public.tasks (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    mapel TEXT NOT NULL DEFAULT 'Matematika',
    kelas_code TEXT NOT NULL DEFAULT '9a',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL NILAI TUGAS 9A (grades)
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id BIGINT,
    nisn TEXT NOT NULL,
    kelas_code TEXT NOT NULL,
    mapel TEXT NOT NULL DEFAULT 'Matematika',
    score NUMERIC,
    status TEXT DEFAULT 'BELUM',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT grades_task_nisn_kelas_mapel_unique UNIQUE (task_id, nisn, kelas_code, mapel)
);

-- 5. TABEL CATATAN BEBAS KELAS BINAAN (binaan_notes) -> Khusus 9B, 8H, 8I
CREATE TABLE IF NOT EXISTS public.binaan_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nisn TEXT NOT NULL,
    kelas_code TEXT NOT NULL,
    catatan TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT binaan_notes_nisn_kelas_unique UNIQUE (nisn, kelas_code)
);

-- 6. TABEL SOFT DELETE / EXCLUSIONS (exclusions)
CREATE TABLE IF NOT EXISTS public.exclusions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nisn TEXT NOT NULL,
    kelas_code TEXT NOT NULL,
    menu_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT exclusions_nisn_kelas_menu_unique UNIQUE (nisn, kelas_code, menu_type)
);

-- 7. TABEL BUKU PERPUSTAKAAN DIGITAL (digital_books)
CREATE TABLE IF NOT EXISTS public.digital_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT,
    category TEXT,
    file_url TEXT,
    cover_url TEXT,
    description TEXT,
    grade TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL PROFIL GURU & PIN (user_profile)
CREATE TABLE IF NOT EXISTS public.user_profile (
    id TEXT PRIMARY KEY DEFAULT 'teacher_profile',
    name TEXT DEFAULT 'Devy, S.Pd.',
    role_title TEXT DEFAULT 'Wali Kelas 9A • Guru Matematika',
    avatar_url TEXT DEFAULT 'https://avatars.githubusercontent.com/u/124599?v=4',
    wallpaper_url TEXT DEFAULT 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
    pin_code TEXT DEFAULT '123456',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inisialisasi Profil Default
INSERT INTO public.user_profile (id, name, role_title, pin_code)
VALUES ('teacher_profile', 'Devy, S.Pd.', 'Wali Kelas 9A • Guru Matematika', '123456')
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) & PUBLIC POLICIES (MULTI-DEVICE)
-- ====================================================================

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.binaan_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent duplicate errors
DROP POLICY IF EXISTS "Public Access students" ON public.students;
DROP POLICY IF EXISTS "Public Access presensi" ON public.presensi;
DROP POLICY IF EXISTS "Public Access tasks" ON public.tasks;
DROP POLICY IF EXISTS "Public Access grades" ON public.grades;
DROP POLICY IF EXISTS "Public Access binaan_notes" ON public.binaan_notes;
DROP POLICY IF EXISTS "Public Access exclusions" ON public.exclusions;
DROP POLICY IF EXISTS "Public Access digital_books" ON public.digital_books;
DROP POLICY IF EXISTS "Public Access user_profile" ON public.user_profile;

-- Create Unrestricted Public/Anon Policies
CREATE POLICY "Public Access students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access presensi" ON public.presensi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access grades" ON public.grades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access binaan_notes" ON public.binaan_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access exclusions" ON public.exclusions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access digital_books" ON public.digital_books FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access user_profile" ON public.user_profile FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for multi-device instant sync
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.presensi;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.grades;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.binaan_notes;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.exclusions;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.digital_books;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profile;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
