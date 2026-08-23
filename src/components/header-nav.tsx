"use client";

import * as React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

/* =========================================================================
   PERHATIAN: DI SINI TEMPAT ANDA BISA MENGEDIT, MENAMBAH, ATAU MENGURANGI LINK
   ========================================================================= */

// 1. Daftar link utama (Single Links)
const navLinks = [
  { title: "Dashboard", href: "/" },
  { title: "Presensi 9A", href: "/presensi/9a" },
  { title: "Tugas 9A", href: "/tugas/9a" },
];

// 2. Daftar link submenu dropdown (Dropdown Links)
const academicFeatures = [
  {
    title: "Tagihan Tugas",
    href: "/tugas/9a",
    description: "Kelola daftar tugas siswa dan cek status pengumpulan.",
  },
  {
    title: "Jadwal Pelajaran",
    href: "/jadwal",
    description: "Lihat dan atur jadwal jam mengajar mingguan.",
  },
  {
    title: "Perpustakaan Digital",
    href: "/perpustakaan",
    description: "Akses koleksi buku modul dan bahan ajar.",
  },
];

export function HeaderNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        
        {/* Logo Brand / Judul */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-foreground hover:opacity-90 transition-opacity">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-5 w-5 text-[#1c71d8]" />
          </div>
          <span className="tracking-tight font-extrabold text-xl">BBB</span>
        </Link>

        {/* Header Navigation Menu */}
        <NavigationMenu>
          <NavigationMenuList className="gap-1">
            
            {/* 1. Menu Link Tunggal */}
            {navLinks.map((item) => (
              <NavigationMenuItem key={item.href}>
                <NavigationMenuLink
                  render={<Link href={item.href} />}
                  className={navigationMenuTriggerStyle()}
                >
                  {item.title}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}

            {/* 2. Menu Link Dropdown */}
            <NavigationMenuItem>
              <NavigationMenuTrigger>Fitur Akademik</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[320px] gap-2 p-3 sm:w-[400px] md:w-[500px] md:grid-cols-2">
                  {academicFeatures.map((feature) => (
                    <li key={feature.href}>
                      <NavigationMenuLink
                        render={<Link href={feature.href} />}
                        className="block select-none space-y-1 rounded-lg p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-semibold leading-none">{feature.title}</div>
                        <p className="line-clamp-2 text-xs leading-snug text-muted-foreground mt-1">
                          {feature.description}
                        </p>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

          </NavigationMenuList>
        </NavigationMenu>

      </div>
    </header>
  );
}
