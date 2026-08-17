import { supabase } from "@/lib/supabase"

export interface DigitalBookRecord {
  id: string
  title: string
  subtitle: string
  size: string
  category: string
  cover: string
  pdfDataUrl: string
  fileName: string
  isNew?: boolean
  createdAt: string
}

export const bookService = {
  // Fetch all digital books from Supabase
  async getBooks(): Promise<DigitalBookRecord[]> {
    try {
      const { data, error } = await supabase
        .from("digital_books")
        .select("*")
        .order("created_at", { ascending: false })

      if (error || !data) return []

      return data.map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle || "",
        size: b.size || "5.00 MB",
        category: b.category || "Buku Digital",
        cover: b.cover || "",
        pdfDataUrl: b.pdf_data_url || "",
        fileName: b.file_name || `${b.title}.pdf`,
        isNew: b.is_new ?? true,
        createdAt: b.created_at ? b.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
      }))
    } catch (err) {
      return []
    }
  },

  // Save new digital book to Supabase
  async addBook(book: DigitalBookRecord): Promise<boolean> {
    try {
      const { error } = await supabase.from("digital_books").insert([
        {
          id: book.id,
          title: book.title,
          subtitle: book.subtitle,
          size: book.size,
          category: book.category || "Buku Digital",
          cover: book.cover,
          pdf_data_url: book.pdfDataUrl,
          file_name: book.fileName,
          is_new: book.isNew ?? true,
          created_at: new Date().toISOString(),
        },
      ])

      return !error
    } catch (err) {
      return false
    }
  },

  // Delete digital book from Supabase
  async deleteBook(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("digital_books").delete().eq("id", id)
      return !error
    } catch (err) {
      return false
    }
  },
}
