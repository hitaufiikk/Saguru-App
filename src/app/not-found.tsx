import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-background text-foreground font-sans px-4 text-center">
      <div className="flex items-center gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight border-r border-border pr-4">
          404
        </h1>
        <p className="text-sm text-muted-foreground font-medium">
          Halaman tidak ditemukan.
        </p>
      </div>
      <p className="text-xs text-muted-foreground mt-3 max-w-sm">
        Halaman yang Anda cari belum tersedia atau sedang dalam tahap pengembangan.
      </p>
      <Link href="/" className="mt-6">
        <Button variant="outline" size="sm">
          Kembali ke Beranda
        </Button>
      </Link>
    </div>
  );
}
