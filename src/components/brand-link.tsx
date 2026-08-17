"use client"

import * as React from "react"
import Link from "next/link"

export function BrandLink({ className }: { className?: string }) {
  const handleClick = () => {
    window.dispatchEvent(new Event("show-welcome-banner"))
  }

  return (
    <Link
      href="/"
      onClick={handleClick}
      className={className || "font-extrabold text-xl tracking-wider text-white dark:text-[#60A5FA] hover:opacity-90 transition-opacity"}
    >
      SAGURU
    </Link>
  )
}
