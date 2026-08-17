"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { Menu, GraduationCap, Users, ClipboardCheck, FileText, Calendar, Database } from "lucide-react"

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { BrandLink } from "@/components/brand-link"

const presensiItems: { title: string; href: string; description: string }[] = [
  {
    title: "Presensi 9A",
    href: "/presensi/9a",
    description: "Wali Kelas Bu Devy",
  },
  {
    title: "Presensi 9B",
    href: "/presensi/9b",
    description: "Binaan Bu Devy",
  },
  {
    title: "Presensi 8H",
    href: "/presensi/8h",
    description: "Binaan Bu Devy",
  },
  {
    title: "Presensi 8I",
    href: "/presensi/8i",
    description: "Binaan Bu Devy",
  },
]

const tugasItems: { title: string; href: string; description: string }[] = [
  {
    title: "Tagihan Tugas 9A (Wali Kelas)",
    href: "/tugas/9a",
    description: "Daftar & status pengumpulan tugas kelas 9A",
  },
  {
    title: "Kelas Binaan",
    href: "/tugas/binaan",
    description: "Daftar & status tugas kelas binaan",
  },
]

const jadwalItems: { title: string; href: string; description: string }[] = [
  {
    title: "Jadwal Mengajar",
    href: "/jadwal",
    description: "Jadwal jam mengajar mingguan",
  },
  {
    title: "Perpustakaan Digital",
    href: "/perpustakaan",
    description: "Buku & referensi digital",
  },
]

export function NavigationMenuDemo() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* 1. Desktop Navigation Menu (Tampil pada layar Laptop/Desktop lg:flex) */}
      <div className="hidden lg:flex">
        <NavigationMenu>
          <NavigationMenuList>
            {/* 1. Data Siswa Dropdown */}
            <NavigationMenuItem>
              <NavigationMenuTrigger>Data Siswa</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="w-96 p-2 space-y-1">
                  <ListItem href="/siswa/9a" title="Kelas 9A">
                    Semua data siswa 9A ada di sini😊
                  </ListItem>
                  <ListItem href="/siswa/9b" title="Kelas Binaan">
                    Kelas Binaan
                  </ListItem>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* 2. Presensi Dropdown */}
            <NavigationMenuItem>
              <NavigationMenuTrigger>Presensi</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="w-96 p-2 space-y-1">
                  {presensiItems.map((component) => (
                    <ListItem
                      key={component.title}
                      title={component.title}
                      href={component.href}
                    >
                      {component.description}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* 3. Tagihan Tugas Dropdown */}
            <NavigationMenuItem>
              <NavigationMenuTrigger>Tagihan Tugas</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="w-96 p-2 space-y-1">
                  {tugasItems.map((item) => (
                    <ListItem key={item.title} href={item.href} title={item.title}>
                      {item.description}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* 4. Jadwal & Modul Dropdown */}
            <NavigationMenuItem>
              <NavigationMenuTrigger>Jadwal &amp; Modul</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="w-96 p-2 space-y-1">
                  {jadwalItems.map((item) => (
                    <ListItem key={item.title} href={item.href} title={item.title}>
                      {item.description}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* 5. Migrasi Data Single Direct Link */}
            <NavigationMenuItem>
              <NavigationMenuLink
                className={navigationMenuTriggerStyle()}
                render={<Link href="/migrasi-data">Migrasi Data</Link>}
              />
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* 2. Mobile & Tablet Navigation Header */}
      <div className="flex lg:hidden items-center justify-between w-full">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="border-none shadow-none bg-transparent hover:bg-white/15 dark:hover:bg-zinc-800/80 text-white dark:text-[#60A5FA] p-0 h-9 w-9 shrink-0 focus-visible:ring-0"
              >
                <Menu className="h-6 w-6 stroke-[2.5]" />
                <span className="sr-only">Buka Menu Sidebar</span>
              </Button>
            }
          />
          <SheetContent side="left" className="w-80 bg-background text-foreground p-0 overflow-y-auto">
            <SheetHeader className="p-5 border-b border-border text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4274D9] text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <SheetTitle className="text-base font-bold tracking-tight">SAGURU</SheetTitle>
                  <p className="text-xs text-muted-foreground">Sistem Administrasi Guru</p>
                </div>
              </div>
            </SheetHeader>

            <div className="p-4 space-y-6">
              {/* Group 1: Data Siswa */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>Data Siswa</span>
                </div>
                <div className="pl-2 space-y-1 border-l-2 border-border ml-1">
                  <Link
                    href="/siswa/9a"
                    onClick={() => setMobileOpen(false)}
                    className="block py-1.5 px-3 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                  >
                    Kelas 9A
                  </Link>
                  <Link
                    href="/siswa/9b"
                    onClick={() => setMobileOpen(false)}
                    className="block py-1.5 px-3 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                  >
                    Kelas Binaan
                  </Link>
                </div>
              </div>

              {/* Group 2: Presensi */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  <span>Presensi</span>
                </div>
                <div className="pl-2 space-y-1 border-l-2 border-border ml-1">
                  {presensiItems.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="block py-1.5 px-3 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Group 3: Tagihan Tugas */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Tagihan Tugas</span>
                </div>
                <div className="pl-2 space-y-1 border-l-2 border-border ml-1">
                  {tugasItems.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="block py-1.5 px-3 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Group 4: Jadwal & Modul */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Jadwal &amp; Modul</span>
                </div>
                <div className="pl-2 space-y-1 border-l-2 border-border ml-1">
                  {jadwalItems.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="block py-1.5 px-3 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Group 5: Migrasi Data */}
              <div className="pt-2 border-t border-border">
                <Link
                  href="/migrasi-data"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 py-2 px-3 text-sm font-semibold rounded-md hover:bg-accent transition-colors text-primary"
                >
                  <Database className="h-4 w-4" />
                  <span>Migrasi Data</span>
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* SAGURU Brand Text Centered in Mobile & Tablet */}
        <div className="flex-1 flex justify-center pr-9">
          <BrandLink />
        </div>
      </div>
    </>
  )
}

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink
        render={
          <Link href={href}>
            <div className="flex flex-col gap-1 text-sm">
              <div className="leading-none font-medium">{title}</div>
              <div className="line-clamp-2 text-muted-foreground">{children}</div>
            </div>
          </Link>
        }
      />
    </li>
  )
}
