# Aktivasi akun guru SAGURU

Login menggunakan Supabase Auth (email dan kata sandi). PIN lokal lama tidak berlaku.
RLS membatasi sembilan tabel aplikasi kepada satu akun dalam `public.teacher_access`.
Tabel tersebut hanya dapat diisi oleh administrator database, bukan dari browser.

1. Buka Supabase Authentication → Users → Add user → Create new user.
2. Isi email guru dan kata sandi yang kuat, lalu aktifkan Auto Confirm. Jangan kirim kata sandi melalui chat.
3. Salin User UID. Jalankan SQL berikut di SQL Editor sebagai administrator, mengganti placeholder dengan UID tersebut:

```sql
INSERT INTO public.teacher_access (user_id)
VALUES ('GANTI_DENGAN_USER_UID'::uuid);
```

Foreign key memastikan UID ada di Auth. Batas singleton mencegah penambahan guru kedua secara tidak sengaja.
Jika sudah ada guru, jangan hapus/ubah keanggotaan tanpa memastikan identitas akun pengganti.
Matikan pendaftaran pengguna baru di pengaturan Auth jika aplikasi hanya dipakai guru ini.
Akun yang mendaftar sendiri tetap tidak mendapat akses data tanpa keanggotaan.

4. Masuk di localhost dengan email dan kata sandi akun tersebut.
5. Uji tambah tugas, isi nilai dan catatan, refresh, lalu cek lagi. Deadline dan catatan harus tetap ada.
6. Uji logout; halaman data tidak boleh tampil sebelum masuk lagi.

## Data lokal lama

Cache `saguru_tasks_list` dan `saguru_grades_matrix` dipertahankan, tidak otomatis diunggah.
ID tugas lama dibuat lokal dan berpotensi bertabrakan antarkelas. Migrasi data lama perlu pemetaan ID dan pemeriksaan isi terlebih dahulu.
Cache server yang baru dipisahkan per kelas. Jangan membersihkan penyimpanan browser sebelum data lama ditinjau/dicadangkan.

## Migrasi database

Perubahan terbaru: `supabase/migrations/20260919205936_teacher_access_and_cloud_tasks.sql`.
Migrasi menambah `tasks.deadline`, `grades.catatan`, daftar guru dan kebijakan RLS.
`supabase_schema.sql` adalah skema lama, bukan sumber untuk menimpa database aktif: struktur dan kebijakan publik di sana sudah tidak sesuai.

## Pemeriksaan

- `node --import tsx scripts/test-cloud-workflow.ts`
- `node_modules/.bin/tsc --noEmit --incremental false`
- Pengujian RLS dilakukan dalam transaksi rollback menggunakan akun dan tugas sintetis: akun tanpa izin ditolak, guru dapat membuat/membaca/mengubah/menghapus tugas, dan guru tidak bisa memberikan akses akun lain. Tidak ada baris uji yang disimpan permanen (sequence ID dapat maju).
- Security Advisor sesudah migrasi: tidak ada temuan.
- Pengujian browser dengan akun guru membutuhkan aktivasi akun di atas.
- Build produksi `next build --webpack`: lulus.
- Lima skrip regresi impor, penyimpanan, kontak dan penghapusan: lulus.
- ESLint pada berkas perubahan terbaru: 0 error, 22 warning (terutama variabel tidak terpakai dan gambar).
