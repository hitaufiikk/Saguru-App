# Audit SAGURU — 20 September 2026

Audit baca saja pada source, pengujian otomatis, metadata/integritas database Supabase, serta halaman login browser localhost. Tidak ada perubahan kode aplikasi atau data operasional dalam audit ini.

## Hasil terverifikasi

- Supabase: 1 pengguna Auth, 1 anggota teacher_access, email guru terkonfirmasi.
- Semua tabel public memiliki RLS; tidak ada public view.
- Data saat pemeriksaan: 33 siswa, 6 tugas, 7 nilai, 0 catatan presensi.
- Integritas: 6 nilai tidak memiliki pasangan students; 0 ketidakcocokan kelas pada nilai dengan siswa yang masih ada; 0 nilai di luar 0–100; 0 DINILAI dengan score NULL saat ini.
- Security Advisor: satu peringatan Leaked Password Protection Disabled. Tidak ada temuan RLS nonaktif. Performance Advisor kosong.
- TypeScript lulus. Enam skrip tes lulus: cloud-workflow, student-contact, student-deletion, import-production, import-flow, storage-path.
- ESLint di luar public: 19 error, 67 warning. Ada error tambahan pada worker PDF vendor. Lint keseluruhan belum lulus.
- Build Webpack lulus pada pengerjaan sebelumnya; tidak diulang karena kode tidak berubah selama audit ini.
- Browser tanpa sesi berhasil diarahkan dari / ke /login. Form memiliki label email/kata sandi dan tombol masuk. Judul tab masih BBB.

## Temuan prioritas tinggi

### 1. Presensi belum dicatat tampil sebagai HADIR

Sumber: src/components/heroui-table.tsx:127–164; src/lib/services/studentService.ts:53; src/lib/services/presensiService.ts:25–39.

Master siswa memasang status HADIR, lalu tabel presensi menggunakan status tersebut jika tidak ada catatan tanggal ini. Kegagalan pembacaan presensi juga dikembalikan sebagai objek kosong. Akibatnya tidak ada catatan dan kegagalan jaringan bisa terlihat sama dengan kehadiran yang sudah dicatat. Saat audit database presensi kosong, meskipun ada 33 siswa. Dashboard memakai catatan nyata sehingga dapat berbeda dengan tabel/export.

Saran: status BELUM_DICATAT, pisahkan loading/error/empty, dan bedakan data tersimpan dengan cache. Kehadiran harus menjadi tindakan eksplisit, termasuk bila ditambahkan tombol hadir semua.

### 2. Nilai tanpa siswa sudah ada di database

Enam dari tujuh nilai tidak memiliki pasangan students.nisn. Grades hanya mempunyai foreign key ke tasks, bukan ke students. Penghapusan siswa menghapus presensi lewat cascade tetapi membiarkan nilai lama. Mengimpor ulang identitas yang sama bisa menampilkan nilai lama kembali.

Sumber: constraint database langsung; src/lib/services/studentService.ts:263–281; src/lib/services/tugasService.ts:125–136.

Saran: tinjau enam baris tersebut sebelum tindakan. Putuskan arsip atau penghapusan nilai ketika siswa dihapus; kemudian tambahkan constraint/relasi yang sesuai. Audit ini tidak menghapus nilai.

### 3. Perubahan sesi dapat membuang isian form

Sumber: src/components/layout-shell.tsx:28–47,67–71.

Setiap event Auth mengubah isAuthenticated menjadi false sehingga seluruh halaman di-unmount sebelum pemeriksaan izin selesai. SDK dapat mengirim SIGNED_IN saat kembali ke tab serta TOKEN_REFRESHED saat refresh token. State form yang belum disimpan berpotensi hilang. Ini temuan penelusuran kode, belum reproduksi browser dengan sesi guru.

Saran: pertahankan halaman untuk identitas yang sama ketika memverifikasi ulang; tutup akses jika sesi berakhir, akun berubah, atau izin ditolak. Jangan reset seluruh pohon UI untuk setiap event.

### 4. SQL lama bisa melemahkan pembatasan baru

Sumber: supabase_schema.sql:127–135.

File masih membuat policy FOR ALL USING(true) WITH CHECK(true). Jika dijalankan kembali, policy permisif tambahan bisa memberi seluruh akun authenticated akses walaupun bukan guru. Grant anon saat ini sudah dicabut, jadi tidak tepat menyatakan menjalankan policy saja otomatis mengembalikan akses anon.

Saran: selaraskan bootstrap dengan migrasi aktif atau hentikan penggunaan file lama secara eksplisit. Dokumentasi sudah menandainya sebagai skema lama, tetapi file masih executable.

## Temuan menengah

### 5. Ekspor presensi bisa diberi tanggal yang berbeda dari datanya

Sumber: src/components/heroui-table.tsx:146–148,289–295,351–375.

Pembacaan mengambil tanggal hari ini, tetapi tanggal ekspor bisa diubah/dibaca dari cache. Mengubah tanggal hanya mengubah label laporan, tidak meminta presensi tanggal tersebut. Saran: satu tanggal terpilih untuk query, cache dan ekspor; jangan cetak label historis di atas data hari ini.

### 6. Profil memberi keberhasilan sebelum server selesai

Sumber: src/components/account-dropdown.tsx:143–162; src/lib/services/profileService.ts:39–62.

Pesan sukses muncul dari penyimpanan lokal, sedangkan saveProfile dipanggil tanpa await dan mengembalikan false ketika gagal. .catch tidak menangkap false. Saran: tunggu konfirmasi server dan pertahankan form saat gagal; perbarui cache sesudahnya.

### 7. Perpustakaan belum tersambung ke penyimpanan server

Sumber: src/app/perpustakaan/page.tsx:36–66,169–205.

PDF penuh dan thumbnail disimpan sebagai base64 ke localStorage; bookService tidak dipanggil halaman tersebut. setBooks dilakukan sebelum setItem, lalu error kuota diabaikan. Buku dapat tampak berhasil namun hilang setelah refresh atau tidak tersedia di perangkat lain.

Saran: file di Supabase Storage dengan akses guru, metadata di database, batas ukuran dan pesan gagal yang jelas. Jangan memigrasikan/menghapus buku lokal sebelum ada salinan terverifikasi.

### 8. Nomor tampilan tugas memakai primary key global

Sumber: src/components/tugas-table.tsx:485,560–563.

Form mengiklankan urutan per mapel (`mapelTasks.length + 1`), tetapi header memakai task.id global. Kelas/mapel baru dapat mulai dari Tugas 7; sequence juga boleh memiliki celah. Saran: tampilkan nomor urut per mapel dan judul tugas; tetap gunakan id untuk relasi internal.

### 9. Validasi dan integritas nilai belum lengkap

Sumber: src/components/tugas-table.tsx:344–356; src/lib/services/tugasService.ts:125–136; constraint database.

DINILAI dengan nilai kosong masih dapat dikirim, walaupun belum ditemukan pada data aktif. Pembatasan skor hanya di client/service, bukan CHECK database. Grades.kelas_code dan mapel tidak terikat ke kelas/mapel task. Saran: aturan status/nilai konsisten dan constraint relasional setelah meninjau data lama.

### 10. Aksi yang terlihat siap tetapi belum menghasilkan berkas

Sumber: src/components/jadwal-mengajar-table.tsx:75–80; src/app/modul/page.tsx:88; src/app/tugas/rekap/page.tsx.

Ekspor jadwal hanya toast, unduh modul hanya alert, dan rekap tugas mengarahkan ke kelas 9A. Saran: implementasikan fungsi atau beri penanda belum tersedia; hindari pesan mengunduh jika tidak ada unduhan.

### 11. Race condition saat mencatat presensi

Sumber: src/components/heroui-table.tsx:263–281.

Tidak ada pending lock per siswa. Dua klik status cepat mengirim dua request; request yang selesai terakhir belum tentu pilihan terakhir. Saran: antrekan per siswa atau kunci kontrol selama penyimpanan dengan indikator proses.

### 12. Pemulihan akun dan perlindungan kata sandi

Form login belum mempunyai alur lupa kata sandi/reset. Guru dapat terhenti jika lupa kata sandi dan membutuhkan admin Supabase. Advisor juga melaporkan Leaked Password Protection Disabled.

Rujukan: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Saran: tentukan alur pemulihan yang sederhana, dan periksa ketersediaan perlindungan kata sandi pada paket proyek.

## UX dan pemeliharaan tambahan

- Judul tab BBB berbeda dengan merek SAGURU (src/app/layout.tsx:18).
- Login belum memiliki tombol tampil/sembunyikan kata sandi.
- Data siswa/presensi masih memakai cache tanpa penanda offline yang jelas.
- Event pembaruan data hanya berlaku pada window sendiri; tidak ditemukan subscriber Supabase Realtime untuk pembaruan langsung perangkat lain. Penyimpanan server sudah ada, tetapi sinkronisasi langsung belum dapat diklaim.
- Data tugas lokal lama sengaja tidak otomatis digabung dengan task server; perlu pemetaan ID jika ingin migrasi historis.
- Impor melakukan pemeriksaan konflik kelas dan upsert sebagai request terpisah; perlindungan terhadap dua impor lintas perangkat secara bersamaan belum atomik.
- Beberapa tes import-flow adalah simulasi alur, bukan menjalankan UI React/PDF sesungguhnya. Kelulusan unit test tidak menjamin bebas masalah interaksi.

## Batas audit visual

Browser Codex memiliki sesi terpisah dan masih berada di halaman login saat audit. Pengguna sudah diminta masuk sendiri tanpa membagikan kata sandi. Jadi tampilan tabel setelah login, mobile, navigasi keyboard, dialog, serta alur simpan end-to-end belum dinyatakan lulus. Temuan halaman tersebut di atas berasal dari source, bukan klaim reproduksi visual.

## Urutan perbaikan yang disarankan

1. Presensi belum dicatat/error, tanggal ekspor dan kunci penyimpanan.
2. Penanganan event Auth tanpa kehilangan isian.
3. Keputusan arsip nilai yatim dan constraint data, serta perapihan SQL bootstrap lama.
4. Profil/perpustakaan server-first dan hasil unduhan nyata.
5. Penomoran tugas, pemulihan akun, polish UI dan lint.
