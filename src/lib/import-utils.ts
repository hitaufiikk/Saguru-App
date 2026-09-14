import * as XLSX from "xlsx"

export interface ParsedStudentRow {
  noAbs: number
  nisn: string
  nama: string
  gender: string
  status: string
}

export interface ParseResult {
  rowsData: ParsedStudentRow[]
  totalRows: number
  sheetName?: string
  detectedHeaders?: {
    nisnIdx: number
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
      raw: false, // Menjaga format teks asli (termasuk nol di depan seperti '0089123001')
      cellFormula: true, // Membaca formula jika ada
      cellDates: true, // Konversi tanggal
    })

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { rowsData: [], totalRows: 0, error: "Berkas tidak memiliki sheet data." }
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
      let genderIdx = -1
      let dataStartRowIdx = -1

      // 1. Pindai 15 baris pertama untuk kolom header (mendukung header gabungan / multi-baris)
      for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
        const row = rawRows[r]
        if (!row || !Array.isArray(row)) continue

        row.forEach((cellVal: any, cIdx: number) => {
          const cellStr = String(cellVal || "").toLowerCase().trim()
          if (!cellStr) return

          // Deteksi kolom NISN / NO INDUK (abaikan baris judul)
          if (
            nisnIdx === -1 &&
            !cellStr.startsWith("daftar") &&
            (cellStr === "nisn" ||
              cellStr === "nis" ||
              cellStr === "induk" ||
              cellStr === "nipd" ||
              cellStr === "nik" ||
              cellStr.includes("nisn") ||
              cellStr.includes("no induk") ||
              cellStr.includes("no. induk"))
          ) {
            nisnIdx = cIdx
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

        if ((namaIdx !== -1 && nisnIdx !== -1) || (namaIdx !== -1 && genderIdx !== -1)) {
          dataStartRowIdx = r + 1
        }
      }

      // 2. Jika header tidak ditemukan lewat kata kunci, deteksi berbasis isi sel
      if (namaIdx === -1 || nisnIdx === -1 || genderIdx === -1) {
        for (let r = 0; r < Math.min(rawRows.length, 25); r++) {
          const row = rawRows[r]
          if (!row || !Array.isArray(row)) continue

          row.forEach((cellVal: any, cIdx: number) => {
            const val = String(cellVal || "").trim()
            if (!val) return

            // Auto NISN: Angka 3-16 digit
            if (nisnIdx === -1 && /^\d{3,16}$/.test(val)) {
              nisnIdx = cIdx
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

      // Fallback default index jika belum terdeteksi
      if (nisnIdx === -1) nisnIdx = 1
      if (namaIdx === -1) namaIdx = 2
      if (genderIdx === -1) genderIdx = 3

      // Cari baris awal data siswa aktual
      let firstDataRow = dataStartRowIdx > 0 ? dataStartRowIdx : 0
      for (let r = 0; r < rawRows.length; r++) {
        const row = rawRows[r]
        if (!row) continue
        const nisnVal = String(row[nisnIdx] || "").trim()
        const namaVal = String(row[namaIdx] || "").trim()

        if (
          (/^\d{3,16}$/.test(nisnVal) || (namaVal && namaVal.length >= 2)) &&
          !/^(no|nisn|nama|jenis|kelamin|l\/p|induk|nomor|page|halaman|kementerian|sekolah|daftar|rekap)/i.test(namaVal) &&
          !/^(no|nisn|nama|jenis|kelamin|l\/p|induk|nomor)/i.test(nisnVal)
        ) {
          firstDataRow = r
          break
        }
      }

      const rowsData: ParsedStudentRow[] = []

      for (let i = firstDataRow; i < rawRows.length; i++) {
        const row = rawRows[i]
        if (!row || !Array.isArray(row) || row.length === 0) continue

        const rawNisn = String(row[nisnIdx] !== undefined ? row[nisnIdx] : "").trim()
        const rawNama = String(row[namaIdx] !== undefined ? row[namaIdx] : "").trim()
        const rawGender = String(row[genderIdx] !== undefined ? row[genderIdx] : "").trim()

        if (!rawNama && !rawNisn) continue

        // Lewati baris header/judul tambahan
        if (
          /^(no|nisn|nama|jenis|kelamin|l\/p|induk|nomor|page|halaman|kementerian|sekolah|daftar|rekap)/i.test(rawNama) ||
          /^(no|nisn|nama|jenis|kelamin|l\/p|induk|nomor)/i.test(rawNisn)
        ) {
          continue
        }

        // Bersihkan digit NISN sambil mempertahankan nol di depan
        const cleanNisnDigits = rawNisn.replace(/[^\d]/g, "")
        const finalNisn = cleanNisnDigits
          ? cleanNisnDigits
          : (rawNisn && !/^(nisn|nis|induk|no)/i.test(rawNisn) ? rawNisn : `00812345${rowsData.length + 1}`)

        // Standarisasi gender
        let finalGender = "Laki-laki"
        const gUpper = rawGender.toUpperCase()
        if (gUpper.startsWith("P") || gUpper === "PEREMPUAN" || gUpper === "CEWEK" || gUpper === "F") {
          finalGender = "Perempuan"
        }

        // Bersihkan nama siswa
        const cleanNama = rawNama
          .replace(/[\d]/g, "")
          .replace(/\s+/g, " ")
          .trim()

        if (cleanNama.length >= 2) {
          rowsData.push({
            noAbs: rowsData.length + 1,
            nisn: finalNisn,
            nama: cleanNama,
            gender: finalGender,
            status: "HADIR",
          })
        }
      }

      const candidateResult: ParseResult = {
        rowsData,
        totalRows: rowsData.length,
        sheetName,
        detectedHeaders: {
          nisnIdx,
          namaIdx,
          genderIdx,
          dataStartRowIdx,
        },
      }

      // Prioritaskan sheet yang memiliki header teridentifikasi (dataStartRowIdx > 0)
      // dan jumlah baris siswa terbanyak
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

    return bestResult || { rowsData: [], totalRows: 0 }
  } catch (err: any) {
    return {
      rowsData: [],
      totalRows: 0,
      error: err?.message || "Gagal memproses berkas spreadsheet.",
    }
  }
}
