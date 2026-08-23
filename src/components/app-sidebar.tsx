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
  Sparkles,
  ShieldCheck,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
  badge?: string
  badgeVariant?: "default" | "secondary" | "outline"
}

interface NavGroupItem {
  title: string
  icon: React.ElementType
  defaultOpen?: boolean
  items: SubMenuItem[]
}

const navGroups: NavGroupItem[] = [
  {
    title: "Data Siswa",
    icon: Users,
    defaultOpen: true,
    items: [
      {
        title: "Kelas 9A",
        href: "/siswa/9a",
        badge: "Wali Kelas",
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
    defaultOpen: true,
    items: [
      {
        title: "Presensi 9A",
        href: "/presensi/9a",
        badge: "9A",
      },
      {
        title: "Presensi 9B",
        href: "/presensi/9b",
        badge: "9B",
      },
      {
        title: "Presensi 8H",
        href: "/presensi/8h",
        badge: "8H",
      },
      {
        title: "Presensi 8I",
        href: "/presensi/8i",
        badge: "8I",
      },
    ],
  },
  {
    title: "Tagihan Tugas",
    icon: FileText,
    defaultOpen: true,
    items: [
      {
        title: "Tagihan Tugas 9A",
        href: "/tugas/9a",
        badge: "Wali Kelas",
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
    defaultOpen: true,
    items: [
      {
        title: "Jadwal Mengajar",
        href: "/jadwal",
      },
      {
        title: "Perpustakaan Digital",
        href: "/perpustakaan",
        badge: "PDF",
      },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  // Track open/collapsed state for each group
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    "Data Siswa": true,
    Presensi: true,
    "Tagihan Tugas": true,
    "Jadwal & Modul": true,
  })

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle],
    }))
  }

  const handleNavClick = () => {
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
              onClick={() => setOpenMobile(false)}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent cursor-pointer"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Tutup Menu</span>
            </Button>
          )}
        </div>
      </SidebarHeader>

      {/* 2. Content Sidebar */}
      <SidebarContent className="px-2 py-3 space-y-4 overflow-y-auto">
        {navGroups.map((group) => {
          const GroupIcon = group.icon
          const isOpen = openGroups[group.title] ?? true

          return (
            <SidebarGroup key={group.title} className="p-0">
              <SidebarGroupLabel
                onClick={() => toggleGroup(group.title)}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/90 hover:text-sidebar-foreground cursor-pointer rounded-lg hover:bg-sidebar-accent/50 transition-colors select-none group/label"
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
                                  {item.badge && (
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                        isActive
                                          ? "bg-white/20 text-white"
                                          : "bg-muted text-muted-foreground border border-border/60"
                                      }`}
                                    >
                                      {item.badge}
                                    </span>
                                  )}
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
                      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        pathname === "/migrasi-data"
                          ? "bg-[#4274D9] text-white shadow-xs"
                          : "text-primary hover:bg-primary/10"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Database className="h-4 w-4" />
                        <span>Migrasi Data Siswa</span>
                      </div>
                      <Sparkles className="h-3.5 w-3.5 opacity-80" />
                    </Link>
                  }
                  tooltip="Migrasi Data Siswa"
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* 4. Footer Sidebar */}
      <SidebarFooter className="border-t border-sidebar-border p-3.5 bg-sidebar/50">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-sidebar-accent/40 border border-sidebar-border/50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 font-bold text-xs">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-bold text-sidebar-foreground truncate">
              Bu Devy, S.Pd.
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              Guru Matematika &amp; Wali 9A
            </span>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
