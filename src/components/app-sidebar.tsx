"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  GraduationCap,
  Users,
  ClipboardCheck,
  FileText,
  Calendar,
  Database,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

interface SubMenuItem {
  title: string
  href: string
}

interface NavGroupItem {
  title: string
  icon: React.ElementType
  items: SubMenuItem[]
}

const navGroups: NavGroupItem[] = [
  {
    title: "Data Siswa",
    icon: Users,
    items: [
      {
        title: "Kelas 9A",
        href: "/siswa/9a",
      },
      {
        title: "Kelas Binaan",
        href: "/siswa/binaan",
      },
    ],
  },
  {
    title: "Presensi",
    icon: ClipboardCheck,
    items: [
      {
        title: "Presensi 9A",
        href: "/presensi/9a",
      },
      {
        title: "Presensi 9B",
        href: "/presensi/9b",
      },
      {
        title: "Presensi 8H",
        href: "/presensi/8h",
      },
      {
        title: "Presensi 8I",
        href: "/presensi/8i",
      },
    ],
  },
  {
    title: "Tagihan Tugas",
    icon: FileText,
    items: [
      {
        title: "Tagihan Tugas 9A",
        href: "/tugas/9a",
      },
      {
        title: "Kelas Binaan",
        href: "/tugas/binaan",
      },
      {
        title: "Rekap Nilai",
        href: "/tugas/rekap",
      },
    ],
  },
  {
    title: "Jadwal & Modul",
    icon: Calendar,
    items: [
      {
        title: "Jadwal Mengajar",
        href: "/jadwal",
      },
      {
        title: "Perpustakaan Digital",
        href: "/perpustakaan",
      },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { isMobile, openMobile, setOpenMobile } = useSidebar()

  // Initial state: SEMUA ACCORDION MENUTUP SECARA DEFAULT (Posisi Awal/Refresh Menutup)
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    "Data Siswa": false,
    Presensi: false,
    "Tagihan Tugas": false,
    "Jadwal & Modul": false,
  })

  // Reset semua accordion menutup saat sidebar ditutup / dibuka ulang
  React.useEffect(() => {
    if (!openMobile) {
      setOpenGroups({
        "Data Siswa": false,
        Presensi: false,
        "Tagihan Tugas": false,
        "Jadwal & Modul": false,
      })
    }
  }, [openMobile])

  // Toggle buka/tutup accordion saat diklik
  const toggleGroup = (groupTitle: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle],
    }))
  }

  // Saat salah satu item menu diklik: tutup accordion & tutup sidebar mobile
  const handleNavClick = () => {
    setOpenGroups({
      "Data Siswa": false,
      Presensi: false,
      "Tagihan Tugas": false,
      "Jadwal & Modul": false,
    })
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar side="left" variant="sidebar" collapsible="offcanvas" className="border-r border-sidebar-border bg-sidebar font-sans">
      {/* 1. Header Sidebar */}
      <SidebarHeader className="border-b border-sidebar-border p-4 bg-sidebar">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            onClick={handleNavClick}
            className="flex items-center gap-3 group focus-visible:outline-hidden"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#3561BD] to-[#4274D9] text-white shadow-sm ring-1 ring-white/20 transition-transform group-hover:scale-105">
              <GraduationCap className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-sidebar-foreground">
                SAGURU
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                Sistem Administrasi Guru
              </span>
            </div>
          </Link>

          {/* Close button specifically for mobile */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setOpenGroups({
                  "Data Siswa": false,
                  Presensi: false,
                  "Tagihan Tugas": false,
                  "Jadwal & Modul": false,
                })
                setOpenMobile(false)
              }}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent cursor-pointer"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Tutup Menu</span>
            </Button>
          )}
        </div>
      </SidebarHeader>

      {/* 2. Content Sidebar */}
      <SidebarContent className="px-2 py-3 space-y-3 overflow-y-auto">
        {navGroups.map((group) => {
          const GroupIcon = group.icon
          const isOpen = openGroups[group.title] ?? false

          return (
            <SidebarGroup key={group.title} className="p-0">
              <SidebarGroupLabel
                onClick={() => toggleGroup(group.title)}
                className="flex items-center justify-between px-2.5 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/90 hover:text-sidebar-foreground cursor-pointer rounded-lg hover:bg-sidebar-accent/50 transition-colors select-none group/label"
              >
                <div className="flex items-center gap-2">
                  <GroupIcon className="h-3.5 w-3.5 text-muted-foreground group-hover/label:text-sidebar-foreground transition-colors" />
                  <span>{group.title}</span>
                </div>
                <div className="flex items-center text-muted-foreground/60 group-hover/label:text-muted-foreground">
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </div>
              </SidebarGroupLabel>

              {isOpen && (
                <SidebarGroupContent className="pt-1">
                  <SidebarMenu className="gap-1">
                    <SidebarMenuSub className="mx-2.5 my-0.5 border-l-2 border-sidebar-border/80 pl-2 space-y-1">
                      {group.items.map((item) => {
                        const isActive = pathname === item.href

                        return (
                          <SidebarMenuSubItem key={item.href}>
                            <SidebarMenuSubButton
                              isActive={isActive}
                              render={
                                <Link
                                  href={item.href}
                                  onClick={handleNavClick}
                                  className={`flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                                    isActive
                                      ? "bg-[#4274D9] text-white font-semibold shadow-xs hover:bg-[#3561bd]"
                                      : "text-sidebar-foreground/85 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                                  }`}
                                >
                                  <span className="truncate">{item.title}</span>
                                </Link>
                              }
                            />
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          )
        })}

        {/* 3. Group Khusus: Migrasi Data */}
        <SidebarGroup className="p-0 pt-2 border-t border-sidebar-border/60">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/migrasi-data"}
                  render={
                    <Link
                      href="/migrasi-data"
                      onClick={handleNavClick}
                      className={`flex items-center w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        pathname === "/migrasi-data"
                          ? "bg-[#4274D9] text-white shadow-xs"
                          : "text-primary hover:bg-primary/10"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Database className="h-4 w-4" />
                        <span>Migrasi Data Siswa</span>
                      </div>
                    </Link>
                  }
                  tooltip="Migrasi Data Siswa"
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
