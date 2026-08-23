"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { BookOpen, Search, Download, Eye, Upload, FileText, CheckCircle2, FileUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Field, FieldGroup } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

export interface DigitalBook {
  id: string
  title: string
  subtitle: string
  size: string
  category: string
  cover: string // Foto/Image Halaman Pertama (Cover) PDF
  pdfDataUrl: string // Full PDF Data URL
  fileName: string
  isNew?: boolean
  createdAt: string
}

export default function PerpustakaanPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewingBook, setViewingBook] = useState<DigitalBook | null>(null)
  const [books, setBooks] = useState<DigitalBook[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("saguru_digital_books_v5")
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) return parsed
        }
      } catch (err) {}
    }
    return []
  })
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Upload Dialog State (Shadcn UI Modal)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileTitle, setFileTitle] = useState("")
  const [fileSubtitle, setFileSubtitle] = useState("")
  const [fileSize, setFileSize] = useState("")
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null)
  const [thumbnailCoverImage, setThumbnailCoverImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const dialogFileInputRef = useRef<HTMLInputElement>(null)

  const saveBooksToStorage = (updated: DigitalBook[]) => {
    setBooks(updated)
    try {
      localStorage.setItem("saguru_digital_books_v5", JSON.stringify(updated))
    } catch (err) {}
  }

  // Filter books by search query
  const filteredBooks = books.filter((b) =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Extract Page 1 of the uploaded PDF into a crisp PNG photo image for wallpaper thumbnail
  const extractPdfFirstPagePhoto = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          const pdfjsLib = await import("pdfjs-dist")

          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || "4.10.38"}/build/pdf.worker.min.mjs`

          const pdf = await pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || "4.10.38"}/cmaps/`,
            cMapPacked: true,
          }).promise

          const page = await pdf.getPage(1)
          const viewport = page.getViewport({ scale: 1.5 })

          const canvas = document.createElement("canvas")
          const context = canvas.getContext("2d")
          canvas.width = viewport.width
          canvas.height = viewport.height

          if (context) {
            await page.render({
              canvasContext: context,
              viewport: viewport,
              canvas: canvas,
            }).promise
            const imgDataUrl = canvas.toDataURL("image/png")
            resolve(imgDataUrl)
            return
          }
        } catch (err) {
          console.warn("Could not extract PDF page 1 photo via PDF.js, using clean document cover fallback:", err)
        }

        // Clean document cover fallback if worker is blocked
        const fallbackCanvas = document.createElement("canvas")
        fallbackCanvas.width = 400
        fallbackCanvas.height = 560
        const ctx = fallbackCanvas.getContext("2d")
        if (ctx) {
          const gradient = ctx.createLinearGradient(0, 0, 400, 560)
          gradient.addColorStop(0, "#1e3a8a")
          gradient.addColorStop(1, "#3b82f6")
          ctx.fillStyle = gradient
          ctx.fillRect(0, 0, 400, 560)

          ctx.fillStyle = "rgba(255, 255, 255, 0.95)"
          ctx.roundRect(30, 100, 340, 360, 16)
          ctx.fill()

          ctx.fillStyle = "#0f172a"
          ctx.font = "bold 20px sans-serif"
          const cleanTitle = file.name.replace(/\.pdf$/i, "")
          const words = cleanTitle.split(" ")
          let line = ""
          let y = 180
          for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + " "
            const metrics = ctx.measureText(testLine)
            if (metrics.width > 280 && i > 0) {
              ctx.fillText(line, 50, y)
              line = words[i] + " "
              y += 28
            } else {
              line = testLine
            }
          }
          ctx.fillText(line, 50, y)
        }
        resolve(fallbackCanvas.toDataURL("image/png"))
      }
      reader.readAsArrayBuffer(file)
    })
  }

  // Handle PDF file selection inside Upload Dialog
  const handleSelectFileInDialog = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      alert("Format berkas harus berupa PDF (.pdf)")
      return
    }

    setIsProcessing(true)
    const exactFileName = file.name
    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + " MB"

    // 1. Read full PDF Data URL for live PDF preview & storage
    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string
      setSelectedFile(file)
      setFileTitle(exactFileName) // Judul HARUS sama persis dengan nama file
      setFileSubtitle(`Berkas PDF "${file.name}" untuk modul pembelajaran digital.`)
      setFileSize(sizeFormatted)
      setPdfDataUrl(dataUrl)

      // 2. Extract clean Page 1 photo image for wallpaper thumbnail
      const coverPhoto = await extractPdfFirstPagePhoto(file)
      setThumbnailCoverImage(coverPhoto)
      setIsProcessing(false)
    }
    reader.readAsDataURL(file)
  }

  // Submit Upload Dialog
  const handleSaveUpload = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !fileTitle || !pdfDataUrl) return

    const newBook: DigitalBook = {
      id: `book-${Date.now()}`,
      title: fileTitle, // Judul buku HARUS sama persis dengan nama file
      subtitle: fileSubtitle.trim() || `Berkas PDF "${fileTitle}" diunggah untuk pembelajaran digital.`,
      size: fileSize || "5.00 MB",
      category: "Buku Digital",
      cover: thumbnailCoverImage || "",
      pdfDataUrl: pdfDataUrl,
      fileName: selectedFile.name,
      isNew: true,
      createdAt: new Date().toISOString().split("T")[0],
    }

    const updated = [newBook, ...books]
    saveBooksToStorage(updated)
    setToastMessage(`Berhasil mengunggah buku digital "${fileTitle}"`)

    // Reset state & close dialog
    setIsUploadOpen(false)
    setSelectedFile(null)
    setFileTitle("")
    setFileSubtitle("")
    setFileSize("")
    setPdfDataUrl(null)
    setThumbnailCoverImage(null)

    if (dialogFileInputRef.current) {
      dialogFileInputRef.current.value = ""
    }

    setTimeout(() => setToastMessage(null), 4000)
  }

  // Trigger download of PDF file
  const handleDownload = (book: DigitalBook) => {
    try {
      const link = document.createElement("a")
      link.href = book.pdfDataUrl
      link.download = book.fileName || `${book.title}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setToastMessage(`Berhasil mengunduh berkas "${book.title}"`)
    } catch (err) {
      setToastMessage(`Mengunduh berkas PDF "${book.title}"...`)
    }
    setTimeout(() => setToastMessage(null), 4000)
  }

  return (
    <main className="min-h-screen bg-background text-foreground pt-4 sm:pt-6 pb-20 px-4 sm:px-6 font-sans">
      <div className="max-w-5xl lg:max-w-6xl mx-auto space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-card p-4 text-xs font-medium text-emerald-600 dark:text-emerald-400 shadow-xl ring-1 ring-foreground/10 animate-in fade-in slide-in-from-bottom-4">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Beranda
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Perpustakaan Digital</span>
        </div>

        {/* Header Action Bar: Search Input & Upload Button */}
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Cari judul buku digital..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-background border-border w-full"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Upload Button opening Shadcn Dialog */}
            <Button
              onClick={() => setIsUploadOpen(true)}
              className="h-9 px-4 text-xs font-semibold gap-1.5 bg-[#4274D9] hover:bg-[#3561bd] text-white shrink-0 cursor-pointer w-full sm:w-auto shadow-xs"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Buku Digital</span>
            </Button>
          </div>
        </div>

        {/* Digital Book Cards Grid using DaisyUI Card Structure */}
        {books.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mx-auto">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">Belum Ada Buku Digital</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Belum ada buku digital yang diunggah. Klik tombol <strong className="text-foreground">+ Upload Buku Digital</strong> di atas untuk menambahkan berkas PDF baru.
              </p>
            </div>
            <Button
              onClick={() => setIsUploadOpen(true)}
              className="h-8 text-xs bg-[#4274D9] hover:bg-[#3561bd] text-white gap-1.5 font-medium mt-1 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Buku Pertama</span>
            </Button>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">Buku Tidak Ditemukan</p>
              <p className="text-xs text-muted-foreground">Tidak ada buku digital yang cocok dengan kata kunci &quot;{searchQuery}&quot;</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => (
              /* DaisyUI Card Component Layout */
              <div
                key={book.id}
                className="card bg-card border border-border shadow-xs hover:shadow-md transition-all rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                {/* Figure: WALLPAPER THUMBNAIL FOTO HALAMAN PERTAMA PDF (CLEAN IMG PHOTO) */}
                <figure className="relative h-56 w-full bg-muted overflow-hidden">
                  {book.cover ? (
                    <img
                      src={book.cover}
                      alt={book.title}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                      Cover Tidak Tersedia
                    </div>
                  )}
                  {book.isNew && (
                    <div className="absolute top-3 right-3 bg-secondary text-secondary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs z-10 pointer-events-none">
                      BARU
                    </div>
                  )}
                </figure>

                {/* Card Body */}
                <div className="card-body p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h2 className="card-title text-sm font-bold text-foreground leading-snug flex items-center justify-between gap-2">
                      <span className="line-clamp-1">{book.title}</span>
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {book.subtitle}
                    </p>
                  </div>

                  {/* Card Actions Footer: ONLY Eye Icon and Download Button */}
                  <div className="card-actions flex items-center justify-end gap-1.5 pt-3 border-t border-border/60">
                    {/* Icons Mata (Pratinjau Kembali Berkas PDF) */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewingBook(book)}
                      title="Lihat Pratinjau Buku"
                      className="h-8 w-8 text-[#4274D9] hover:bg-[#4274D9]/10 cursor-pointer"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {/* Button Download */}
                    <Button
                      size="sm"
                      onClick={() => handleDownload(book)}
                      className="h-8 text-xs px-3 gap-1.5 bg-[#4274D9] hover:bg-[#3561bd] text-white cursor-pointer font-medium"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SHADCN UPLOAD DIALOG MODAL */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent className="sm:max-w-2xl bg-card border-border shadow-2xl p-0 overflow-hidden">
            <form onSubmit={handleSaveUpload}>
              <DialogHeader className="p-5 pb-3 border-b border-border">
                <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Upload className="h-5 w-5 text-[#4274D9]" />
                  <span>Upload Buku Digital Baru (.pdf)</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Pilih berkas PDF. Judul buku otomatis menyesuaikan nama berkas dan pratinjau berkas dapat dicek sebelum unggah.
                </DialogDescription>
              </DialogHeader>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Hidden File Input Picker */}
                <input
                  type="file"
                  ref={dialogFileInputRef}
                  accept=".pdf,application/pdf"
                  onChange={handleSelectFileInDialog}
                  className="hidden"
                />

                <FieldGroup className="space-y-4">
                  {/* Field 1: Area Dropzone / Button Pilih File */}
                  <Field>
                    <Label className="text-xs font-semibold">Pilih Berkas PDF</Label>
                    {!selectedFile ? (
                      <div
                        onClick={() => dialogFileInputRef.current?.click()}
                        className="border-2 border-dashed border-border hover:border-[#4274D9] rounded-2xl p-8 text-center space-y-3 cursor-pointer transition-all bg-muted/20 hover:bg-muted/40 mt-1.5"
                      >
                        <div className="w-12 h-12 rounded-full bg-[#4274D9]/10 text-[#4274D9] flex items-center justify-center mx-auto">
                          <FileUp className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-foreground">Klik untuk Pilih Berkas PDF</p>
                          <p className="text-xs text-muted-foreground">Format yang didukung: .pdf (Maksimal 50MB)</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between gap-3 mt-1.5">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="space-y-0.5 overflow-hidden">
                            <p className="text-xs font-bold text-foreground truncate">{selectedFile.name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{fileSize}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => dialogFileInputRef.current?.click()}
                          className="h-8 text-xs text-[#4274D9] hover:bg-[#4274D9]/10 shrink-0"
                        >
                          Ganti File
                        </Button>
                      </div>
                    )}
                  </Field>

                  {/* Field 2: Judul Buku Digital (HARUS SAMA PERSIS DENGAN NAMA FILE) */}
                  <Field>
                    <Label htmlFor="upload-file-title" className="text-xs font-semibold">
                      Judul Buku Digital <span className="text-muted-foreground font-normal">(Sama persis dengan nama file)</span>
                    </Label>
                    <Input
                      id="upload-file-title"
                      value={fileTitle}
                      readOnly
                      placeholder="Judul otomatis terisi sesuai nama file PDF..."
                      className="h-9 text-xs font-semibold bg-muted border-border text-foreground font-mono mt-1"
                    />
                  </Field>

                  {/* Field 3: Deskripsi / Subtitle Buku */}
                  <Field>
                    <Label htmlFor="upload-file-subtitle" className="text-xs font-semibold">
                      Deskripsi / Subtitle Buku
                    </Label>
                    <Input
                      id="upload-file-subtitle"
                      value={fileSubtitle}
                      onChange={(e) => setFileSubtitle(e.target.value)}
                      placeholder="Masukkan deskripsi singkat buku digital..."
                      className="h-9 text-xs bg-background border-border mt-1"
                    />
                  </Field>

                  {/* Field 4: PRATINJAU CEK BERKAS PDF DULU SEBELUM UPLOAD */}
                  {selectedFile && pdfDataUrl && (
                    <Field>
                      <Label className="text-xs font-semibold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5 text-[#4274D9]" />
                          <span>Pratinjau Berkas PDF (Cek Sebelum Upload)</span>
                        </span>
                        {isProcessing && (
                          <span className="text-[11px] text-[#4274D9] animate-pulse">Memuat Berkas...</span>
                        )}
                      </Label>
                      <div className="w-full h-80 rounded-xl border border-border overflow-hidden bg-muted relative mt-1.5 shadow-xs">
                        <iframe
                          src={`${pdfDataUrl}#toolbar=1&navpanes=0`}
                          className="w-full h-full border-none"
                          title="Pratinjau Berkas PDF Sebelum Upload"
                        />
                      </div>
                    </Field>
                  )}
                </FieldGroup>
              </div>

              <DialogFooter className="p-4 border-t border-border flex items-center justify-end gap-2 bg-muted/10">
                <DialogClose render={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null)
                      setFileTitle("")
                      setFileSubtitle("")
                      setPdfDataUrl(null)
                      setThumbnailCoverImage(null)
                    }}
                    className="h-8 text-xs px-3"
                  >
                    Batal
                  </Button>
                } />
                <Button
                  type="submit"
                  disabled={!selectedFile || isProcessing}
                  className="h-8 text-xs px-4 bg-[#4274D9] hover:bg-[#3561bd] text-white font-medium cursor-pointer"
                >
                  Simpan & Unggah
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG PRATINJAU KEMBALI MENGGUNAKAN IKON MATA */}
        <Dialog open={!!viewingBook} onOpenChange={(open) => { if (!open) setViewingBook(null); }}>
          <DialogContent className="sm:max-w-4xl bg-card border-border shadow-2xl p-0 overflow-hidden">
            <DialogHeader className="p-4 pb-3 border-b border-border flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#4274D9]" />
                  <span>{viewingBook?.title}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {viewingBook?.subtitle}
                </DialogDescription>
              </div>
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                {viewingBook?.size}
              </span>
            </DialogHeader>

            {/* LIVE PDF VIEWER (PRATINJAU KEMBALI) */}
            <div className="p-4 bg-muted/20 flex flex-col items-center justify-center min-h-[500px]">
              {viewingBook?.pdfDataUrl ? (
                <div className="w-full h-[520px] rounded-xl border border-border overflow-hidden bg-background shadow-xs">
                  <iframe
                    src={`${viewingBook.pdfDataUrl}#toolbar=1&navpanes=0&view=FitH`}
                    className="w-full h-full border-none"
                    title={viewingBook.title}
                  />
                </div>
              ) : (
                <div className="text-xs text-muted-foreground p-8 text-center">
                  Berkas PDF tidak ditemukan
                </div>
              )}
            </div>

            <DialogFooter className="p-3 border-t border-border flex justify-between items-center bg-muted/10">
              <DialogClose render={<Button variant="outline" className="h-8 text-xs px-3">Tutup Pratinjau</Button>} />
              <Button
                onClick={() => {
                  if (viewingBook) handleDownload(viewingBook)
                  setViewingBook(null)
                }}
                className="h-8 text-xs bg-[#4274D9] hover:bg-[#3561bd] text-white gap-1.5 font-medium px-4"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Unduh Berkas</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
