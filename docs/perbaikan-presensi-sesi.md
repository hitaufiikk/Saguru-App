# Perbaikan presensi dan kestabilan sesi

- Status tanpa catatan server adalah BELUM_DICATAT. Tampilan dan ekspor menulis “Belum dicatat”; rekap hadir tidak memasukkannya.
- Pemilih tanggal menjadi sumber tanggal query, penyimpanan dan ekspor. Metadata tanggal ekspor hanya-baca.
- Presensi gagal dimuat tidak diganti dengan status dari cache master siswa. Edit dan ekspor diblokir sampai data tanggal terpilih tersedia; tersedia tombol Coba lagi.
- Selama penyimpanan, kontrol status/tanggal dikunci. Lock ref mencegah klik ganda sebelum render React berikutnya. Dispensasi gagal disimpan tetap terbuka.
- Request lama diabaikan saat tanggal berubah atau penyimpanan dimulai.
- Verifikasi sesi untuk identitas yang sama mempertahankan halaman/form. Logout, akun berbeda, atau izin ditolak menutup akses. Error jaringan verifikasi ulang mempertahankan form dengan peringatan; otorisasi database RLS tetap berlaku.

Verifikasi:
- test-attendance-session.ts: gate sesi, respons lama, logout/pencabutan izin, filter tanggal, error pembacaan, generator Excel/PDF.
- test-student-deletion.ts: lulus, termasuk presensi tidak membuat ulang siswa.
- Build produksi Webpack: lulus.
- Browser dengan sesi guru: kelas 8I menampilkan 33 belum dicatat, tanggal dapat diganti, export disabled saat memuat, dan tanggal/status preview sesuai.
- Audit browser tidak menyimpan presensi palsu untuk siswa nyata. Penulisan presensi dan pergantian event sesi diuji lewat fungsi/mock; refresh token nyata end-to-end belum dipaksakan.
- Tidak ada perubahan skema, RLS, atau pembersihan nilai lama pada pekerjaan ini.
