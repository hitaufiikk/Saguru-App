"use client"

import * as React from "react"
import Link from "next/link"
import { Menu } from "lucide-react"

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
import { BrandLink } from "@/components/brand-link"
import { useSidebar } from "@/components/ui/sidebar"

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
  const { setOpenMobile } = useSidebar()

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
                  <ListItem href="/siswa/binaan" title="Kelas Binaan">
                    Kelas Binaan Bu Devy (9B, 8H, 8I)
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpenMobile(true)}
          className="border-none shadow-none bg-transparent hover:bg-white/15 dark:hover:bg-zinc-800/80 text-white dark:text-[#60A5FA] p-0 h-9 w-9 shrink-0 focus-visible:ring-0 cursor-pointer"
        >
          <Menu className="h-6 w-6 stroke-[2.5]" />
          <span className="sr-only">Buka Menu Sidebar</span>
        </Button>

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
