"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Camera,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Move,
  Trash2,
  RotateCcw,
  Palette,
  GraduationCap,
  Sparkles,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AvatarCropperDialog } from "@/components/avatar-cropper-dialog"
import { supabase } from "@/lib/supabase"
import {
  profileService,
  generateProfileSubtext,
  DEFAULT_AVATAR,
  DEFAULT_WALLPAPER,
  DEFAULT_NAME,
  DEFAULT_MAPEL,
  DEFAULT_KELAS_AJAR,
  DEFAULT_WALI_KELAS,
  DEFAULT_TAHUN_AJARAN,
} from "@/lib/services/profileService"
import { cn } from "@/lib/utils"

const AVAILABLE_KELAS = ["9A", "9B", "8H", "8I", "9C", "9D", "8A", "8B"]
const MAPEL_OPTIONS = [
  "Matematika",
  "IPA",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "IPS",
  "Informatika",
  "Pendidikan Pancasila",
  "PJOK",
  "Seni Budaya",
  "Prakarya",
  "PAI & Budi Pekerti",
]
const TAHUN_OPTIONS = ["2024/2025", "2025/2026", "2026/2027", "2027/2028"]

export function AccountDropdown() {
  const router = useRouter()
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Committed profile state (displayed in app)
  const [name, setName] = useState(DEFAULT_NAME)
  const [roleTitle, setRoleTitle] = useState("Wali Kelas 9A • Guru Matematika")
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR)
  const [wallpaperUrl, setWallpaperUrl] = useState(DEFAULT_WALLPAPER)
  const [mapel, setMapel] = useState(DEFAULT_MAPEL)
  const [kelasAjar, setKelasAjar] = useState<string[]>(DEFAULT_KELAS_AJAR)
  const [waliKelas, setWaliKelas] = useState(DEFAULT_WALI_KELAS)
  const [tahunAjaran, setTahunAjaran] = useState(DEFAULT_TAHUN_AJARAN)

  // Draft state inside modal (preview only until saved)
  const [draftName, setDraftName] = useState(DEFAULT_NAME)
  const [draftAvatarUrl, setDraftAvatarUrl] = useState(DEFAULT_AVATAR)
  const [draftWallpaperUrl, setDraftWallpaperUrl] = useState(DEFAULT_WALLPAPER)
  const [draftMapel, setDraftMapel] = useState(DEFAULT_MAPEL)
  const [draftKelasAjar, setDraftKelasAjar] = useState<string[]>(DEFAULT_KELAS_AJAR)
  const [draftWaliKelas, setDraftWaliKelas] = useState(DEFAULT_WALI_KELAS)
  const [draftTahunAjaran, setDraftTahunAjaran] = useState(DEFAULT_TAHUN_AJARAN)

  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null)
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null)

  // Tab aktif di dalam modal pengaturan profil ("identitas" | "penugasan" | "wallpaper")
  const [activeProfileTab, setActiveProfileTab] = useState<string>("identitas")

  // State untuk Avatar Cropper Dialog (Reposisi foto pas lingkaran)
  const [cropperOpen, setCropperOpen] = useState<boolean>(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const wallpaperInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let isMounted = true
    const loadProfile = async () => {
      // 1. Coba ambil dari Supabase terlebih dahulu
      try {
        const p = await profileService.getProfile()
        if (isMounted && p) {
          if (p.name) setName(p.name)
          if (p.roleTitle) setRoleTitle(p.roleTitle)
          if (p.avatarUrl) setAvatarUrl(p.avatarUrl)
          if (p.wallpaperUrl) setWallpaperUrl(p.wallpaperUrl)
          if (p.mapel) setMapel(p.mapel)
          if (p.kelasAjar) setKelasAjar(p.kelasAjar)
          if (p.waliKelas !== undefined) setWaliKelas(p.waliKelas)
          if (p.tahunAjaran) setTahunAjaran(p.tahunAjaran)

          // Sinkronisasi cache lokal setelah data server diperoleh
          try {
            localStorage.setItem("saguru_profile_name", p.name || DEFAULT_NAME)
            localStorage.setItem("saguru_profile_role", p.roleTitle || "Wali Kelas 9A • Guru Matematika")
            localStorage.setItem("saguru_avatar_photo", p.avatarUrl || DEFAULT_AVATAR)
            localStorage.setItem("saguru_wallpaper_photo", p.wallpaperUrl || DEFAULT_WALLPAPER)
            localStorage.setItem("saguru_profile_mapel", p.mapel || DEFAULT_MAPEL)
            localStorage.setItem("saguru_profile_kelas_ajar", JSON.stringify(p.kelasAjar || DEFAULT_KELAS_AJAR))
            localStorage.setItem("saguru_profile_wali_kelas", p.waliKelas ?? DEFAULT_WALI_KELAS)
            localStorage.setItem("saguru_profile_tahun_ajaran", p.tahunAjaran || DEFAULT_TAHUN_AJARAN)
          } catch (e) {}
          return
        }
      } catch (err) {}

      // 2. Fallback: pertahankan data pengguna yang sudah tersimpan di localStorage
      try {
        const savedAvatar = localStorage.getItem("saguru_avatar_photo")
        if (savedAvatar && isMounted) setAvatarUrl(savedAvatar)

        const savedWallpaper = localStorage.getItem("saguru_wallpaper_photo")
        if (savedWallpaper && isMounted) setWallpaperUrl(savedWallpaper)

        const savedName = localStorage.getItem("saguru_profile_name")
        if (savedName && isMounted) setName(savedName)

        const savedMapel = localStorage.getItem("saguru_profile_mapel")
        if (savedMapel && isMounted) setMapel(savedMapel)

        const savedKelasAjar = localStorage.getItem("saguru_profile_kelas_ajar")
        if (savedKelasAjar && isMounted) {
          try {
            const parsed = JSON.parse(savedKelasAjar)
            if (Array.isArray(parsed)) setKelasAjar(parsed)
          } catch (e) {}
        }

        const savedWaliKelas = localStorage.getItem("saguru_profile_wali_kelas")
        if (savedWaliKelas !== null && isMounted) setWaliKelas(savedWaliKelas)

        const savedTahunAjaran = localStorage.getItem("saguru_profile_tahun_ajaran")
        if (savedTahunAjaran && isMounted) setTahunAjaran(savedTahunAjaran)

        const savedRole = localStorage.getItem("saguru_profile_role")
        if (savedRole && isMounted) {
          setRoleTitle(savedRole)
        } else if (isMounted) {
          setRoleTitle(
            generateProfileSubtext({
              mapel: savedMapel || DEFAULT_MAPEL,
              waliKelas: savedWaliKelas || DEFAULT_WALI_KELAS,
            })
          )
        }
      } catch (err) {}
    }

    loadProfile()
    return () => {
      isMounted = false
    }
  }, [])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      alert("Gagal keluar. Silakan coba lagi.")
      return
    }
    router.replace("/login")
  }

  // Buka modal dan inisialisasi state draft dari data yang aktif
  const handleOpenProfileModal = (initialTab: string = "identitas") => {
    setDraftName(name)
    setDraftAvatarUrl(avatarUrl)
    setDraftWallpaperUrl(wallpaperUrl)
    setDraftMapel(mapel)
    setDraftKelasAjar([...kelasAjar])
    setDraftWaliKelas(waliKelas)
    setDraftTahunAjaran(tahunAjaran)
    setSaveErrorMsg(null)
    setSaveSuccessMsg(null)
    setActiveProfileTab(initialTab)
    setProfileOpen(true)
  }

  // Kontrol buka/tutup modal: menutup modal membuang seluruh draft yang belum disimpan
  const handleProfileOpenChange = (open: boolean) => {
    if (isSavingProfile) return
    if (open) {
      handleOpenProfileModal(activeProfileTab || "identitas")
    } else {
      setSaveErrorMsg(null)
      setSaveSuccessMsg(null)
      setProfileOpen(false)
    }
  }

  // Upload Foto Profil: memuat file dan membuka cropper reposisi foto
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = String(event.target.result)
          setImageToCrop(dataUrl)
          setCropperOpen(true)
        }
      }
      reader.readAsDataURL(file)
      e.target.value = "" // Reset agar file yang sama bisa dipilih lagi jika perlu
    }
  }

  // Buka dialog reposisi/crop untuk foto aktif di draft
  const handleOpenCropper = () => {
    if (draftAvatarUrl && draftAvatarUrl !== "" && draftAvatarUrl !== DEFAULT_AVATAR) {
      setImageToCrop(draftAvatarUrl)
      setCropperOpen(true)
    } else {
      avatarInputRef.current?.click()
    }
  }

  // Terapkan hasil potongan dari cropper
  const handleApplyCroppedAvatar = (croppedUrl: string) => {
    setDraftAvatarUrl(croppedUrl)
    setSaveErrorMsg(null)
  }

  // Hapus foto profil (kembali ke avatar inisial nama)
  const handleRemoveAvatar = () => {
    setDraftAvatarUrl("")
    setSaveErrorMsg(null)
    setSaveSuccessMsg(null)
  }

  // Upload Wallpaper Cover (hanya pratinjau, belum disimpan)
  const handleWallpaperFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setDraftWallpaperUrl(String(event.target.result))
        }
      }
      reader.readAsDataURL(file)
      e.target.value = ""
    }
  }

  // Reset wallpaper cover ke default SAGURU
  const handleResetWallpaper = () => {
    setDraftWallpaperUrl(DEFAULT_WALLPAPER)
    setSaveErrorMsg(null)
    setSaveSuccessMsg(null)
  }

  // Multi-select toggle kelas ajar
  const handleToggleKelasAjar = (kls: string) => {
    setDraftKelasAjar((prev) =>
      prev.includes(kls) ? prev.filter((k) => k !== kls) : [...prev, kls]
    )
  }

  // Subteks otomatis live preview
  const draftSubtext = generateProfileSubtext({
    mapel: draftMapel,
    waliKelas: draftWaliKelas,
    kelasAjar: draftKelasAjar,
  })

  // Simpan perubahan: Supabase terlebih dahulu -> lalu perbarui cache lokal
  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSavingProfile) return

    setSaveErrorMsg(null)
    setSaveSuccessMsg(null)
    setIsSavingProfile(true)

    const computedRole = generateProfileSubtext({
      mapel: draftMapel,
      waliKelas: draftWaliKelas,
      kelasAjar: draftKelasAjar,
    })

    try {
      // 1. Simpan ke Supabase terlebih dahulu
      const res = await profileService.saveProfile({
        name: draftName,
        roleTitle: computedRole,
        avatarUrl: draftAvatarUrl,
        wallpaperUrl: draftWallpaperUrl,
        mapel: draftMapel,
        kelasAjar: draftKelasAjar,
        waliKelas: draftWaliKelas,
        tahunAjaran: draftTahunAjaran,
      })

      if (!res.success) {
        // Jika server gagal, pertahankan isian dan tampilkan pesan yang jelas
        setSaveErrorMsg(res.error || "Gagal menyimpan profil ke server. Silakan periksa koneksi dan coba lagi.")
        setIsSavingProfile(false)
        return
      }

      // 2. Jika server berhasil, perbarui state aktif aplikasi
      setName(draftName)
      setRoleTitle(computedRole)
      setAvatarUrl(draftAvatarUrl)
      setWallpaperUrl(draftWallpaperUrl)
      setMapel(draftMapel)
      setKelasAjar(draftKelasAjar)
      setWaliKelas(draftWaliKelas)
      setTahunAjaran(draftTahunAjaran)

      // 3. Perbarui cache lokal browser
      try {
        localStorage.setItem("saguru_profile_name", draftName)
        localStorage.setItem("saguru_profile_role", computedRole)
        localStorage.setItem("saguru_avatar_photo", draftAvatarUrl)
        localStorage.setItem("saguru_wallpaper_photo", draftWallpaperUrl)
        localStorage.setItem("saguru_profile_mapel", draftMapel)
        localStorage.setItem("saguru_profile_kelas_ajar", JSON.stringify(draftKelasAjar))
        localStorage.setItem("saguru_profile_wali_kelas", draftWaliKelas)
        localStorage.setItem("saguru_profile_tahun_ajaran", draftTahunAjaran)
      } catch (err) {
        console.warn("Gagal memperbarui cache lokal:", err)
      }

      setSaveSuccessMsg("Profil & penugasan berhasil diperbarui!")
      setTimeout(() => {
        setSaveSuccessMsg(null)
        setProfileOpen(false)
        setIsSavingProfile(false)
      }, 1000)
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan profil."
      setSaveErrorMsg(errorText)
      setIsSavingProfile(false)
    }
  }

  // Token settings state
  const [currentPassToken, setCurrentPassToken] = useState("")
  const [newToken, setNewToken] = useState("")
  const [confirmNewToken, setConfirmNewToken] = useState("")
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [tokenSuccess, setTokenSuccess] = useState<string | null>(null)

  const [updatingPassword, setUpdatingPassword] = useState(false)
  const passwordPending = useRef(false)
  const handleUpdateToken = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (passwordPending.current) return
    setTokenError(null)
    setTokenSuccess(null)
    if (newToken.length < 8) {
      setTokenError("Gunakan minimal 8 karakter.")
      return
    }
    if (newToken !== confirmNewToken) {
      setTokenError("Konfirmasi kata sandi tidak cocok.")
      return
    }
    passwordPending.current = true
    setUpdatingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newToken,
        current_password: currentPassToken,
      })
      if (error) throw error
      setTokenSuccess("Kata sandi berhasil diperbarui.")
      setCurrentPassToken("")
      setNewToken("")
      setConfirmNewToken("")
    } catch {
      setTokenError("Gagal memperbarui kata sandi. Periksa kata sandi lama dan koneksi Anda.")
    } finally {
      passwordPending.current = false
      setUpdatingPassword(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-9 w-9 border border-white/20 shadow-xs">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
              {name ? name.substring(0, 2).toUpperCase() : "DV"}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-1.5" align="end">
          {/* Header Menu Label */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="p-2 space-y-0.5">
              <div className="font-medium text-sm text-foreground truncate">{name}</div>
              <div className="text-xs text-muted-foreground truncate">{roleTitle}</div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Menu Items */}
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => handleOpenProfileModal("identitas")}
              onSelect={() => handleOpenProfileModal("identitas")}
              className="cursor-pointer gap-2.5 px-2.5 py-2 text-xs font-medium"
            >
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1">Pengaturan Profil</span>
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                setTokenError(null)
                setTokenSuccess(null)
                setSettingsOpen(true)
              }}
              onSelect={() => {
                setTokenError(null)
                setTokenSuccess(null)
                setSettingsOpen(true)
              }}
              className="cursor-pointer gap-2.5 px-2.5 py-2 text-xs font-medium"
            >
              <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1">Pengaturan</span>
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Logout Item */}
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={handleLogout}
              onSelect={handleLogout}
              className="cursor-pointer gap-2.5 px-2.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-500/10"
            >
              <LogOut className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <span className="flex-1">Logout</span>
              <DropdownMenuShortcut className="text-red-500/80">⇧⌘Q</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Profile & Upload Wallpaper Dialog */}
      <Dialog open={profileOpen} onOpenChange={handleProfileOpenChange}>
        <DialogContent className="w-[94vw] sm:w-[88vw] md:w-[75vw] sm:max-w-none max-w-4xl lg:max-w-5xl max-h-[90dvh] p-0 overflow-y-auto overscroll-contain bg-card border-border shadow-2xl rounded-2xl">
          {/* Header Live Wallpaper Banner & Avatar Preview (Pratinjau Draft) */}
          <div className="relative w-full h-36 sm:h-44 md:h-48 bg-muted overflow-hidden shrink-0 group">
            <img
              src={draftWallpaperUrl}
              alt="Wallpaper Cover"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />

            <input
              type="file"
              ref={wallpaperInputRef}
              accept="image/*"
              onChange={handleWallpaperFileChange}
              disabled={isSavingProfile}
              className="hidden"
            />

            {/* Menu Aksi Wallpaper di Dalam Pengaturan Profil */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={isSavingProfile}
                  className="h-7 px-2.5 text-[11px] font-semibold bg-black/60 hover:bg-black/80 text-white border border-white/20 gap-1.5 shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center justify-center rounded-md transition-colors"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>Atur Wallpaper</span>
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 p-1 bg-card border-border shadow-xl z-50">
                  <DropdownMenuItem
                    onClick={() => wallpaperInputRef.current?.click()}
                    className="cursor-pointer gap-2 text-xs"
                  >
                    <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Ganti Wallpaper</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleResetWallpaper}
                    className="cursor-pointer gap-2 text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Reset Wallpaper ke Default</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Avatar Circle with Floating Action Badges */}
            <div className="absolute -bottom-5 sm:-bottom-6 left-6 sm:left-8 flex items-end gap-3 z-10">
              <div className="relative group/avatar">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-4 ring-card shadow-lg bg-background">
                  <AvatarImage src={draftAvatarUrl || undefined} alt={draftName} className="object-cover" />
                  <AvatarFallback className="text-sm sm:text-base font-bold bg-primary text-primary-foreground">
                    {draftName ? draftName.substring(0, 2).toUpperCase() : "DV"}
                  </AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  ref={avatarInputRef}
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  disabled={isSavingProfile}
                  className="hidden"
                />

                {/* Floating Action Overlay on Avatar */}
                <div className="absolute inset-0 rounded-full bg-black/65 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center gap-1.5 text-white transition-opacity">
                  <button
                    type="button"
                    disabled={isSavingProfile}
                    onClick={() => avatarInputRef.current?.click()}
                    title="Unggah Foto Baru"
                    className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  {draftAvatarUrl && draftAvatarUrl !== "" && (
                    <button
                      type="button"
                      disabled={isSavingProfile}
                      onClick={handleOpenCropper}
                      title="Posisikan / Geser Foto"
                      className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      <Move className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {draftAvatarUrl && draftAvatarUrl !== "" && (
                    <button
                      type="button"
                      disabled={isSavingProfile}
                      onClick={handleRemoveAvatar}
                      title="Hapus Foto Profil"
                      className="p-1 rounded-full hover:bg-red-500/40 text-red-300 hover:text-red-200 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="flex flex-col">
            {/* Header Dialog Titles & Messages */}
            <div className="p-4 sm:p-6 md:p-8 pb-2 sm:pb-3 pt-7 sm:pt-8 md:pt-9 space-y-3">
              <DialogHeader className="p-0 text-left">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Pengaturan Profil &amp; Penugasan Guru
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Kelola identitas, foto profil, perwalian, mata pelajaran, dan tampilan akun guru Anda.
                </DialogDescription>
              </DialogHeader>

              {saveSuccessMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {saveErrorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{saveErrorMsg}</span>
                </div>
              )}
            </div>

            {/* Navigation Tabs (Standar Industri) */}
            <Tabs value={activeProfileTab} onValueChange={setActiveProfileTab} className="w-full">
              <div className="px-4 sm:px-6 md:px-8 border-b border-border/60">
                <TabsList className="h-10 p-1 bg-muted/60 w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
                  <TabsTrigger value="identitas" className="text-xs gap-1.5 cursor-pointer">
                    <User className="h-3.5 w-3.5" />
                    <span>Identitas &amp; Foto</span>
                  </TabsTrigger>
                  <TabsTrigger value="penugasan" className="text-xs gap-1.5 cursor-pointer">
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>Penugasan Mengajar</span>
                  </TabsTrigger>
                  <TabsTrigger value="wallpaper" className="text-xs gap-1.5 cursor-pointer">
                    <Palette className="h-3.5 w-3.5" />
                    <span>Wallpaper &amp; Media</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* TAB 1: IDENTITAS & FOTO */}
              <TabsContent value="identitas" className="p-4 sm:p-6 md:p-8 space-y-4 focus:outline-none">
                {/* Kontrol Foto Profil */}
                <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <div className="text-xs font-semibold text-foreground">Foto Profil Avatar</div>
                      <div className="text-[11px] text-muted-foreground">
                        {draftAvatarUrl && draftAvatarUrl !== ""
                          ? "Foto profil kustom aktif. Anda dapat memposisikan atau menggantinya."
                          : "Saat ini menggunakan inisial nama default."}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSavingProfile}
                        onClick={() => avatarInputRef.current?.click()}
                        className="h-8 text-xs gap-1.5 border-border hover:bg-accent cursor-pointer font-medium"
                      >
                        <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Upload Foto</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSavingProfile || !draftAvatarUrl || draftAvatarUrl === ""}
                        onClick={handleOpenCropper}
                        className="h-8 text-xs gap-1.5 border-border hover:bg-accent cursor-pointer font-medium disabled:opacity-40"
                      >
                        <Move className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Posisikan / Geser</span>
                      </Button>

                      {draftAvatarUrl && draftAvatarUrl !== "" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isSavingProfile}
                          onClick={handleRemoveAvatar}
                          className="h-8 text-xs gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer font-medium"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus Foto</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <FieldGroup className="space-y-4 pt-1">
                  {/* Nama Lengkap */}
                  <Field>
                    <Label htmlFor="name-1" className="text-xs font-semibold">Nama Lengkap</Label>
                    <Input
                      id="name-1"
                      name="name"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className="h-9 text-xs"
                      required
                      disabled={isSavingProfile}
                    />
                  </Field>

                  {/* Subteks / Jabatan Otomatis */}
                  <Field className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-muted-foreground">Subteks / Jabatan (Otomatis)</Label>
                      <span className="text-[10px] text-muted-foreground">Otomatis dari Penugasan</span>
                    </div>
                    <div className="h-9 px-3 rounded-md bg-muted/60 border border-border/80 flex items-center text-xs font-medium text-foreground select-none truncate">
                      {draftSubtext}
                    </div>
                  </Field>
                </FieldGroup>
              </TabsContent>

              {/* TAB 2: PENUGASAN MENGAJAR */}
              <TabsContent value="penugasan" className="p-4 sm:p-6 md:p-8 space-y-4 focus:outline-none">
                <FieldGroup className="space-y-4">
                  {/* Mata Pelajaran & Tahun Ajaran */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Field className="space-y-1">
                      <Label htmlFor="profile-mapel" className="text-xs font-semibold">Mata Pelajaran</Label>
                      <Select
                        value={draftMapel}
                        onValueChange={(val) => { if (val) setDraftMapel(val) }}
                        disabled={isSavingProfile}
                      >
                        <SelectTrigger id="profile-mapel" className="h-9 text-xs bg-background">
                          <SelectValue placeholder="Pilih Mapel" />
                        </SelectTrigger>
                        <SelectContent>
                          {MAPEL_OPTIONS.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field className="space-y-1">
                      <Label htmlFor="profile-tahun" className="text-xs font-semibold">Tahun Ajaran</Label>
                      <Select
                        value={draftTahunAjaran}
                        onValueChange={(val) => { if (val) setDraftTahunAjaran(val) }}
                        disabled={isSavingProfile}
                      >
                        <SelectTrigger id="profile-tahun" className="h-9 text-xs bg-background">
                          <SelectValue placeholder="Pilih Tahun" />
                        </SelectTrigger>
                        <SelectContent>
                          {TAHUN_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {/* Kelas Perwalian & Pratinjau Subteks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Field className="space-y-1">
                      <Label htmlFor="profile-wali" className="text-xs font-semibold">Kelas Perwalian</Label>
                      <Select
                        value={draftWaliKelas}
                        onValueChange={(val) => { if (val) setDraftWaliKelas(val) }}
                        disabled={isSavingProfile}
                      >
                        <SelectTrigger id="profile-wali" className="h-9 text-xs bg-background">
                          <SelectValue placeholder="Pilih Perwalian" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Tidak menjadi wali kelas</SelectItem>
                          {AVAILABLE_KELAS.map((k) => (
                            <SelectItem key={k} value={k}>Kelas {k}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">Subteks Tergenerate</Label>
                      <div className="h-9 px-3 rounded-md bg-muted/60 border border-border/80 flex items-center text-xs font-medium text-foreground select-none truncate">
                        {draftSubtext}
                      </div>
                    </Field>
                  </div>

                  {/* Kelas yang Diajar (Checkbox Multi-select) */}
                  <Field className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Kelas yang Diajar</Label>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {draftKelasAjar.length} kelas terpilih
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 pt-0.5">
                      {AVAILABLE_KELAS.map((k) => {
                        const isChecked = draftKelasAjar.includes(k)
                        return (
                          <label
                            key={k}
                            className={cn(
                              "flex items-center justify-center sm:justify-start gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors select-none",
                              isChecked
                                ? "border-[#4274D9]/40 bg-[#4274D9]/10 text-foreground font-semibold"
                                : "border-border hover:bg-accent/40 text-muted-foreground"
                            )}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => handleToggleKelasAjar(k)}
                              disabled={isSavingProfile}
                            />
                            <span>{k}</span>
                          </label>
                        )
                      })}
                    </div>
                  </Field>
                </FieldGroup>
              </TabsContent>

              {/* TAB 3: WALLPAPER & TAMPILAN */}
              <TabsContent value="wallpaper" className="p-4 sm:p-6 md:p-8 space-y-4 focus:outline-none">
                <div className="p-4 rounded-xl border border-border/70 bg-muted/30 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-foreground">Pengaturan Wallpaper &amp; Media</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Sesuaikan gambar sampul profil Anda. Disarankan gambar rasio horizontal/lanskap (minimal 1200x400 piksel).
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSavingProfile}
                      onClick={() => wallpaperInputRef.current?.click()}
                      className="h-8 text-xs gap-1.5 border-border hover:bg-accent cursor-pointer font-medium"
                    >
                      <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Upload Wallpaper Baru</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSavingProfile}
                      onClick={handleResetWallpaper}
                      className="h-8 text-xs gap-1.5 border-border hover:bg-accent cursor-pointer font-medium"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Reset Wallpaper ke Default</span>
                    </Button>


                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Dialog Footer */}
            <div className="p-4 sm:p-6 md:p-8 pt-4 border-t border-border/60 bg-card/80 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                type="button"
                onClick={() => handleProfileOpenChange(false)}
                disabled={isSavingProfile}
                className="h-8 text-xs cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSavingProfile}
                className="h-8 text-xs bg-[#4274D9] hover:bg-[#3561bd] text-white font-medium cursor-pointer shadow-sm"
              >
                {isSavingProfile ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </span>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Avatar Cropper & Repositioner Dialog */}
      <AvatarCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={imageToCrop}
        onApply={handleApplyCroppedAvatar}
      />

      {/* Set TOKEN Akses Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleUpdateToken}>
            <DialogHeader>
              <DialogTitle>Ubah Kata Sandi</DialogTitle>
              <DialogDescription>
                Perbarui kata sandi akun guru Anda.
              </DialogDescription>
            </DialogHeader>

            {tokenError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                {tokenError}
              </div>
            )}

            {tokenSuccess && (
              <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                {tokenSuccess}
              </div>
            )}

            <FieldGroup className="py-4 space-y-3">
              <Field>
                <Label htmlFor="current-token" className="text-xs font-semibold">Kata Sandi Saat Ini</Label>
                <Input
                  id="current-token"
                  type="password"
                  value={currentPassToken}
                  onChange={(e) => setCurrentPassToken(e.target.value)}
                  autoComplete="current-password"
                  className="h-9 text-xs font-mono tracking-widest"
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="new-token" className="text-xs font-semibold">Kata Sandi Baru</Label>
                <Input
                  id="new-token"
                  type="password"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  autoComplete="new-password"
                  className="h-9 text-xs font-mono tracking-widest"
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="confirm-token" className="text-xs font-semibold">Konfirmasi Kata Sandi Baru</Label>
                <Input
                  id="confirm-token"
                  type="password"
                  value={confirmNewToken}
                  onChange={(e) => setConfirmNewToken(e.target.value)}
                  autoComplete="new-password"
                  className="h-9 text-xs font-mono tracking-widest"
                  required
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" className="h-8 text-xs">Batal</Button>} />
              <Button type="submit" disabled={updatingPassword} className="h-8 text-xs bg-[#4274D9] hover:bg-[#3561bd] text-white font-medium">Simpan Kata Sandi</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
