"use client"

import * as React from "react"
import Link from "next/link"
import {
  GraduationCap,
  Users,
  ClipboardCheck,
  FileText,
  Calendar,
  Database,
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
} from "@/components/ui/sidebar"

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      {/* Header Sidebar */}
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4274D9] text-white shrink-0 shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
            <span className="font-extrabold text-base tracking-tight text-sidebar-foreground">BBB</span>
            <span className="text-xs text-muted-foreground truncate">Sistem Administrasi Guru</span>
          </div>
        </Link>
      </SidebarHeader>

      {/* Content Sidebar */}
      <SidebarContent>
        {/* Grup 1: Data Siswa */}
        <SidebarGroup>
          <SidebarGroupLabel>Data Siswa</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/siswa/9a" />} tooltip="Kelas 9A (Wali Kelas)">
                  <Users />
                  <span>Kelas 9A (Wali Kelas)</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/siswa/binaan" />} tooltip="Kelas Binaan">
                  <Users />
                  <span>Kelas Binaan</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Grup 2: Presensi */}
        <SidebarGroup>
          <SidebarGroupLabel>Presensi</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/presensi/9a" />} tooltip="Presensi 9A">
                  <ClipboardCheck />
                  <span>Presensi 9A</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/presensi/9b" />} tooltip="Presensi 9B">
                  <ClipboardCheck />
                  <span>Presensi 9B</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/presensi/8h" />} tooltip="Presensi 8H">
                  <ClipboardCheck />
                  <span>Presensi 8H</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/presensi/8i" />} tooltip="Presensi 8I">
                  <ClipboardCheck />
                  <span>Presensi 8I</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Grup 3: Tagihan Tugas */}
        <SidebarGroup>
          <SidebarGroupLabel>Tagihan Tugas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/tugas/9a" />} tooltip="Tugas Kelas 9A">
                  <FileText />
                  <span>Tugas Kelas 9A</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/tugas/binaan" />} tooltip="Tugas Kelas Binaan">
                  <FileText />
                  <span>Tugas Kelas Binaan</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/tugas/rekap" />} tooltip="Rekap Nilai">
                  <FileText />
                  <span>Rekap Nilai</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Grup 4: Jadwal & Modul */}
        <SidebarGroup>
          <SidebarGroupLabel>Jadwal & Modul</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/jadwal" />} tooltip="Jadwal Pelajaran">
                  <Calendar />
                  <span>Jadwal Pelajaran</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/modul" />} tooltip="Modul & Bahan Ajar">
                  <FileText />
                  <span>Modul & Bahan Ajar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Grup 5: Migrasi Data */}
        <SidebarGroup>
          <SidebarGroupLabel>Lainnya</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/migrasi-data" />} tooltip="Migrasi Data">
                  <Database />
                  <span>Migrasi Data</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer Sidebar */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <span>BBB &copy; 2026 Admin Guru</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
