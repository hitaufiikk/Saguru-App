export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 footer sm:footer-horizontal footer-center bg-background/90 backdrop-blur-md text-muted-foreground border-t border-border p-3 text-xs sm:text-sm text-center shadow-xs">
      <aside>
        <p>Copyright © {new Date().getFullYear()} - Belajar Bareng Bu Devy</p>
      </aside>
    </footer>
  )
}
