import * as XLSX from "xlsx"

export interface ParsedStudentRow {
  noAbs: number
  nisn: string
  nis?: string
  identityType: "NISN" | "NIS" | "TIDAK_ADA"
  nama: string
  gender: string
  status: string
}

export interface SkippedRowInfo {
  rowNumber: number
  reason: string
  rawData?: any[]
}

export interface ParseResult {
  rowsData: ParsedStudentRow[]
  totalRows: number
  skippedRows: SkippedRowInfo[]
  totalSkipped: number
  sheetName?: string
  detectedHeaders?: {
    nisnIdx: number
    nisIdx?: number
    namaIdx: number
    genderIdx: number
    dataStartRowIdx: number
  }
  error?: string
}

/**
 * Parsing berkas spreadsheet (Excel .xlsx, .xls, dan CSV) untuk impor data siswa.
 * Menggunakan SheetJS resmi terverifikasi keamanannya.
 */
export function parseSpreadsheetData(data: ArrayBuffer | Uint8Array | string): ParseResult {
  try {
    const isString = typeof data === "string"
    const workbook = XLSX.read(data, {
      type: isString ? "string" : "array",
      raw: false, // Menjaga format teks asli (termasuk nol di depan seperti '0089123001' atau '00123')
      cellFormula: true, // Membaca formula jika ada
      cellDates: true, // Konversi tanggal
    })

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { rowsData: [], totalRows: 0, skippedRows: [], totalSkipped: 0, error: "Berkas tidak memiliki sheet data." }
    }

    let bestResult: ParseResult | null = null

    // Pindai sheet dalam workbook untuk menemukan sheet yang memuat data siswa valid
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      if (!worksheet || !worksheet["!ref"]) continue

      // Ekstraksi 2D array dari worksheet
      const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, {
        header: 1,
        raw: false,
        defval: "",
      })

      if (!rawRows || rawRows.length === 0) continue

      let namaIdx = -1
      let nisnIdx = -1
      let nisIdx = -1
      let genderIdx = -1
      let dataStartRowIdx = -1

      // 1. Pindai 15 baris pertama untuk kolom header (mendukung header gabungan / multi-baris)
      for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
        const row = rawRows[r]
        if (!row || !Array.isArray(row)) continue

        row.forEach((cellVal: any, cIdx: number) => {
          const cellStr = String(cellVal || "").toLowerCase().trim()
          if (!cellStr) return

          // Deteksi kolom NISN spesifik (nomor nasional 10-digit)
          if (
            nisnIdx === -1 &&
            !cellStr.startsWith("daftar") &&
            (cellStr === "nisn" ||
              cellStr === "no. nisn" ||
              cellStr === "no nisn" ||
              cellStr === "nomor nisn" ||
              cellStr.includes("nisn"))
          ) {
            nisnIdx = cIdx
          }

          // Deteksi kolom NIS / NO INDUK spesifik (nomor induk lokal sekolah)
          if (
            nisIdx === -1 &&
            !cellStr.startsWith("daftar") &&
            !cellStr.includes("nisn") &&
            (cellStr === "nis" ||
              cellStr === "no. nis" ||
              cellStr === "no nis" ||
              cellStr === "nomor nis" ||
              cellStr === "induk" ||
              cellStr === "no induk" ||
              cellStr === "no. induk" ||
              cellStr === "nomor induk" ||
              cellStr === "nipd" ||
              cellStr === "nik" ||
              cellStr.includes("no induk") ||
              cellStr.includes("no. induk") ||
              cellStr.includes("nomor induk") ||
              cellStr.includes("nipd"))
          ) {
            nisIdx = cIdx
          }

          // Deteksi kolom NAMA (abaikan judul berkas seperti "daftar nama siswa", "nama sekolah")
          if (
            namaIdx === -1 &&
            !cellStr.startsWith("daftar") &&
            !cellStr.includes("sekolah") &&
            !cellStr.includes("guru") &&
            (cellStr === "nama" ||
              cellStr === "nama siswa" ||
              cellStr === "nama peserta didik" ||
              cellStr.includes("peserta didik") ||
              cellStr.includes("nama lengkap") ||
              (cellStr.includes("nama") && cellStr.length <= 20))
          ) {
            namaIdx = cIdx
          }

          // Deteksi kolom GENDER / L/P
          if (
            genderIdx === -1 &&
            (cellStr === "l/p" ||
              cellStr === "l / p" ||
              cellStr === "jk" ||
              cellStr === "gender" ||
              cellStr.includes("jenis kelamin") ||
              cellStr.includes("kelamin"))
          ) {
            genderIdx = cIdx
          }
        })

        if ((namaIdx !== -1 && (nisnIdx !== -1 || nisIdx !== -1)) || (namaIdx !== -1 && genderIdx !== -1)) {
          dataStartRowIdx = r + 1
        }
      }

      // 2. Jika header tidak ditemukan lewat kata kunci, deteksi berbasis isi sel
      if (namaIdx === -1 || (nisnIdx === -1 && nisIdx === -1) || genderIdx === -1) {
        for (let r = 0; r < Math.min(rawRows.length, 25); r++) {
          const row = rawRows[r]
          if (!row || !Array.isArray(row)) continue

          row.forEach((cellVal: any, cIdx: number) => {
            const val = String(cellVal || "").trim()
            if (!val) return

            // Auto NISN: Angka persis 10 digit
            if (nisnIdx === -1 && /^\d{10}$/.test(val) && cIdx !== nisIdx) {
              nisnIdx = cIdx
            }

            // Auto NIS: Angka 3-9 digit
            if (nisIdx === -1 && /^\d{3,9}$/.test(val) && cIdx !== nisnIdx) {
              nisIdx = cIdx
            }

            // Auto Gender: L/P atau Laki-laki/Perempuan
            if (
              genderIdx === -1 &&
              /^(L|P|LAKI-LAKI|PEREMPUAN|COWOK|CEWEK|M|F)$/i.test(val)
            ) {
              genderIdx = cIdx
            }

            // Auto Nama: Kata-kata huruf, bukan gender atau angka
            if (
              namaIdx === -1 &&
              /^[A-Za-z\s'.,-]{3,50}$/.test(val) &&
              !/^(L|P|LAKI-LAKI|PEREMPUAN|COWOK|CEWEK|NO|NISN|INDUK|NAMA|Halaman)$/i.test(val) &&
              !/^\d+$/.test(val)
            ) {
              namaIdx = cIdx
            }
          })
        }
      }

      // Fallback default index jika belum terdeteksi sama sekali
      if (nisnIdx === -1 && nisIdx === -1) {
        nisnIdx = 1
      }
      if (namaIdx === -1) namaIdx = 2
      if (genderIdx === -1) genderIdx = 3

      // Cari baris awal data siswa aktual
      let firstDataRow = dataStartRowIdx > 0 ? dataStartRowIdx : 0
      for (let r = 0; r < rawRows.length; r++) {
        const row = rawRows[r]
        if (!row || !Array.isArray(row)) continue
        const checkNisn = nisnIdx !== -1 ? String(row[nisnIdx] || "").trim() : ""
        const checkNis = nisIdx !== -1 ? String(row[nisIdx] || "").trim() : ""
        const checkNama = namaIdx !== -1 ? String(row[namaIdx] || "").trim() : ""

        if (
          ((/^\d{3,16}$/.test(checkNisn) || /^\d{3,16}$/.test(checkNis)) || (checkNama && checkNama.length >= 2)) &&
          !/^(no|nisn|nama|jenis|kelamin|l\/p|induk|nomor|page|halaman|kementerian|sekolah|daftar|rekap|wali|mata)/i.test(checkNama) &&
          !/^(no|nisn|nama|jenis|kelamin|l\/p|induk|nomor)/i.test(checkNisn) &&
          !/^(no|nisn|nama|jenis|kelamin|l\/p|induk|nomor)/i.test(checkNis)
        ) {
          firstDataRow = r
          break
        }
      }

      const rowsData: ParsedStudentRow[] = []
      const skippedRows: SkippedRowInfo[] = []

      for (let i = firstDataRow; i < rawRows.length; i++) {
        const row = rawRows[i]
        // Lewati jika seluruh baris kosong
        if (
          !row ||
          !Array.isArray(row) ||
          row.length === 0 ||
          row.every((c) => c === null || c === undefined || String(c).trim() === "")
        ) {
          continue
        }

        const rawNisn = nisnIdx !== -1 && row[nisnIdx] !== undefined ? String(row[nisnIdx]).trim() : ""
        const rawNis = nisIdx !== -1 && row[nisIdx] !== undefined ? String(row[nisIdx]).trim() : ""
        const rawNama = namaIdx !== -1 && row[namaIdx] !== undefined ? String(row[namaIdx]).trim() : ""
        const rawGender = genderIdx !== -1 && row[genderIdx] !== undefined ? String(row[genderIdx]).trim() : ""

        // Lewati baris header/judul/rekap tambahan
        const isHeaderOrSummary =
          /^(no|nisn|nama|jenis|kelamin|l\/p|induk|nomor|page|halaman|kementerian|sekolah|daftar|rekap|wali\s*kelas|mata\s*pelajaran|tahun\s*pelajaran|kelas\s*:|semester)/i.test(rawNama) ||
          /^(no|nisn|nama|jenis|kelamin|l\/p|induk|nomor)/i.test(rawNisn) ||
          /^(no|nisn|nama|jenis|kelamin|l\/p|induk|nomor)/i.test(rawNis) ||
          /^(l\s*=|p\s*=|jmlh|jumlah|total)/i.test(rawNama) ||
          /^(l\s*=|p\s*=|jmlh|jumlah|total)/i.test(rawNis) ||
          /^(l\s*=|p\s*=|jmlh|jumlah|total)/i.test(rawNisn)

        if (isHeaderOrSummary) {
          continue
        }

        // Bersihkan nama siswa (hanya huruf dan tanda baca nama, hapus angka dan spasi ganda)
        const cleanNama = rawNama
          .replace(/[\d]/g, "")
          .replace(/\s+/g, " ")
          .trim()

        // Evaluasi baris yang dilewati karena nama tidak valid / kosong
        if (cleanNama.length < 2) {
          const hasSomeData =
            Boolean(rawNisn) ||
            Boolean(rawNis) ||
            Boolean(rawGender) ||
            row.some((c) => c !== null && c !== undefined && String(c).trim() !== "")

          if (hasSomeData) {
            skippedRows.push({
              rowNumber: i + 1,
              reason: rawNama
                ? "Nama siswa tidak valid (< 2 karakter)"
                : "Nama siswa kosong atau formula tanpa hasil tersimpan",
              rawData: row,
            })
          }
          continue
        }

        // Standarisasi identitas (NISN vs NIS)
        // PERHATIAN: Pertahankan identitas sebagai teks mentah termasuk nol di depan.
        // JANGAN memotong digit, JANGAN menambahkan nol, dan JANGAN membuat nomor pengganti!
        const validNisn = rawNisn && !/^(nisn|nis|induk|no|-|n\/a|null|undefined)$/i.test(rawNisn) ? rawNisn : ""
        const validNis = rawNis && !/^(nisn|nis|induk|no|-|n\/a|null|undefined)$/i.test(rawNis) ? rawNis : ""

        let finalNisn = ""
        let finalNis: string | undefined = undefined
        let identityType: "NISN" | "NIS" | "TIDAK_ADA" = "TIDAK_ADA"

        if (validNisn && validNis) {
          // Keduanya ada dalam berkas: NISN dan NIS tidak tertukar
          finalNisn = validNisn
          finalNis = validNis
          identityType = "NISN"
        } else if (validNisn) {
          // Hanya NISN
          finalNisn = validNisn
          identityType = "NISN"
        } else if (validNis) {
          // Hanya NIS (Nomor Induk Lokal)
          // Sesuai kontrak data aplikasi dan skema database, disimpan ke field nisn sebagai identitas utama
          finalNisn = validNis
          finalNis = validNis
          identityType = "NIS"
        } else {
          // Tidak ada identitas: Biarkan string kosong, JANGAN buat nomor tiruan palsu
          finalNisn = ""
          identityType = "TIDAK_ADA"
        }

        // Standarisasi gender
        let finalGender = "Laki-laki"
        const gUpper = rawGender.toUpperCase()
        if (gUpper.startsWith("P") || gUpper === "PEREMPUAN" || gUpper === "CEWEK" || gUpper === "F") {
          finalGender = "Perempuan"
        }

        rowsData.push({
          noAbs: rowsData.length + 1,
          nisn: finalNisn,
          ...(finalNis ? { nis: finalNis } : {}),
          identityType,
          nama: cleanNama,
          gender: finalGender,
          status: "HADIR",
        })
      }

      const candidateResult: ParseResult = {
        rowsData,
        totalRows: rowsData.length,
        skippedRows,
        totalSkipped: skippedRows.length,
        sheetName,
        detectedHeaders: {
          nisnIdx,
          nisIdx: nisIdx !== -1 ? nisIdx : undefined,
          namaIdx,
          genderIdx,
          dataStartRowIdx,
        },
      }

      // Prioritaskan sheet yang memiliki baris siswa terbanyak dan header teridentifikasi
      if (!bestResult) {
        bestResult = candidateResult
      } else {
        const candidateHasHeader = candidateResult.detectedHeaders && candidateResult.detectedHeaders.dataStartRowIdx > 0
        const bestHasHeader = bestResult.detectedHeaders && bestResult.detectedHeaders.dataStartRowIdx > 0

        if (candidateHasHeader && !bestHasHeader) {
          bestResult = candidateResult
        } else if (candidateHasHeader === bestHasHeader && candidateResult.totalRows > bestResult.totalRows) {
          bestResult = candidateResult
        }
      }
    }

    return bestResult || { rowsData: [], totalRows: 0, skippedRows: [], totalSkipped: 0 }
  } catch (err: any) {
    return {
      rowsData: [],
      totalRows: 0,
      skippedRows: [],
      totalSkipped: 0,
      error: err?.message || "Gagal memproses berkas spreadsheet.",
    }
  }
}
