-- Add parent contact without changing existing students, keys, or access policies.
-- TEXT preserves leading zeroes and international prefixes such as +62.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS kontak_ortu TEXT;
