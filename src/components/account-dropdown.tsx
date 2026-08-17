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
import { Camera, Image as ImageIcon, Upload, CheckCircle2, User, Settings, LogOut, Lock } from "lucide-react"

import { profileService } from "@/lib/services/profileService"

const DEFAULT_AVATAR = "https://avatars.githubusercontent.com/u/124599?v=4"
const DEFAULT_WALLPAPER = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop"

export function AccountDropdown() {
  const router = useRouter()
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Profile data & photos state
  const [name, setName] = useState("Devy, S.Pd.")
  const [roleTitle, setRoleTitle] = useState("Wali Kelas 9A • Guru Matematika")
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR)
  const [wallpaperUrl, setWallpaperUrl] = useState(DEFAULT_WALLPAPER)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const wallpaperInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let isMounted = true

    // 1. Read LocalStorage first for instant render
    try {
      const savedAvatar = localStorage.getItem("saguru_avatar_photo")
      if (savedAvatar) setAvatarUrl(savedAvatar)

      const savedWallpaper = localStorage.getItem("saguru_wallpaper_photo")
      if (savedWallpaper) setWallpaperUrl(savedWallpaper)

      const savedName = localStorage.getItem("saguru_profile_name")
      if (savedName) setName(savedName)

      const savedRole = localStorage.getItem("saguru_profile_role")
      if (savedRole) setRoleTitle(savedRole)
    } catch (err) {}

    // 2. Sync with Supabase so changes on HP instantly reflect on Desktop!
    async function syncProfileFromSupabase() {
      const supProfile = await profileService.getProfile()
      if (supProfile && isMounted) {
        setName(supProfile.name)
        setRoleTitle(supProfile.roleTitle)
        setAvatarUrl(supProfile.avatarUrl)
        setWallpaperUrl(supProfile.wallpaperUrl)

        try {
          localStorage.setItem("saguru_profile_name", supProfile.name)
          localStorage.setItem("saguru_profile_role", supProfile.roleTitle)
          localStorage.setItem("saguru_avatar_photo", supProfile.avatarUrl)
          localStorage.setItem("saguru_wallpaper_photo", supProfile.wallpaperUrl)
        } catch (err) {}
      }
    }

    syncProfileFromSupabase()
    return () => {
      isMounted = false
    }
  }, [])

  const handleLogout = () => {
    try {
      localStorage.removeItem("saguru_is_authenticated")
      localStorage.removeItem("saguru_remember_me")
      sessionStorage.clear()
    } catch (err) {
      console.error("Gagal menghapus token autentikasi:", err)
    }
    window.location.href = "/login"
  }

  // Handle Avatar Photo Upload
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          const b64 = String(event.target.result)
          setAvatarUrl(b64)
          try {
            localStorage.setItem("saguru_avatar_photo", b64)
          } catch (err) {}

          // Sync to Supabase
          profileService.saveProfile({ avatarUrl: b64, name, roleTitle, wallpaperUrl })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle Wallpaper Cover Photo Upload
  const handleWallpaperFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          const b64 = String(event.target.result)
          setWallpaperUrl(b64)
          try {
            localStorage.setItem("saguru_wallpaper_photo", b64)
          } catch (err) {}

          // Sync to Supabase
          profileService.saveProfile({ wallpaperUrl: b64, name, roleTitle, avatarUrl })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      localStorage.setItem("saguru_profile_name", name)
      localStorage.setItem("saguru_profile_role", roleTitle)

      // Sync to Supabase
      await profileService.saveProfile({ name, roleTitle, avatarUrl, wallpaperUrl })

      setSaveSuccessMsg("Profil & Wallpaper berhasil diperbarui!")
      setTimeout(() => {
        setSaveSuccessMsg(null)
        setProfileOpen(false)
      }, 1200)
    } catch (err) {
      console.error("Gagal menyimpan profil:", err)
    }
  }

  // Token settings state
  const [currentPassToken, setCurrentPassToken] = useState("")
  const [newToken, setNewToken] = useState("")
  const [confirmNewToken, setConfirmNewToken] = useState("")
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [tokenSuccess, setTokenSuccess] = useState<string | null>(null)

  const handleUpdateToken = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setTokenError(null)
    setTokenSuccess(null)

    const savedToken = localStorage.getItem("saguru_app_token") || "123456"

    if (currentPassToken !== savedToken) {
      setTokenError("Token saat ini salah!")
      return
    }

    if (newToken.length !== 6 || !/^\d{6}$/.test(newToken)) {
      setTokenError("Token baru harus 6 digit angka!")
      return
    }

    if (newToken !== confirmNewToken) {
      setTokenError("Konfirmasi token baru tidak cocok!")
      return
    }

    try {
      localStorage.setItem("saguru_app_token", newToken)
      setTokenSuccess("Token Akses berhasil diperbarui!")
      setTimeout(() => {
        setSettingsOpen(false)
        setCurrentPassToken("")
        setNewToken("")
        setConfirmNewToken("")
        setTokenSuccess(null)
      }, 1200)
    } catch (err) {
      setTokenError("Gagal menyimpan token baru.")
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
              onClick={() => setProfileOpen(true)}
              onSelect={() => setProfileOpen(true)}
              className="cursor-pointer gap-2.5 px-2.5 py-2 text-xs font-medium"
            >
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1">Profil Guru</span>
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
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-border">
          {/* Header Live Wallpaper Banner & Avatar Preview */}
          <div className="relative w-full h-32 bg-muted overflow-hidden group">
            <img
              src={wallpaperUrl}
              alt="Wallpaper Cover"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />

            <input
              type="file"
              ref={wallpaperInputRef}
              accept="image/*"
              onChange={handleWallpaperFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => wallpaperInputRef.current?.click()}
              className="absolute top-3 right-3 h-7 px-2.5 text-[11px] font-semibold bg-black/50 hover:bg-black/75 text-white border border-white/20 gap-1.5 shadow-md cursor-pointer"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Ganti Wallpaper</span>
            </Button>

            <div className="absolute -bottom-5 left-6 flex items-end gap-3">
              <div className="relative group/avatar">
                <Avatar className="h-16 w-16 ring-4 ring-card shadow-lg bg-background">
                  <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
                  <AvatarFallback className="text-sm font-bold bg-primary text-primary-foreground">
                    {name ? name.substring(0, 2).toUpperCase() : "DV"}
                  </AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  ref={avatarInputRef}
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  title="Unggah Foto Profil"
                  className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span className="text-[9px] font-semibold mt-0.5">Ubah</span>
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="p-6 pt-8 space-y-4">
            <DialogHeader className="p-0 text-left">
              <DialogTitle className="text-base font-bold text-foreground">Pengaturan Profil &amp; Wallpaper</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Unggah foto profil dan foto wallpaper untuk mempercantik akun Anda.
              </DialogDescription>
            </DialogHeader>

            {saveSuccessMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => avatarInputRef.current?.click()}
                className="h-8 text-xs gap-1.5 border-border hover:bg-accent cursor-pointer font-medium"
              >
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Upload Foto Profil</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => wallpaperInputRef.current?.click()}
                className="h-8 text-xs gap-1.5 border-border hover:bg-accent cursor-pointer font-medium"
              >
                <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Upload Wallpaper</span>
              </Button>
            </div>

            <FieldGroup className="space-y-3 pt-1">
              <Field>
                <Label htmlFor="name-1" className="text-xs font-semibold">Nama Lengkap</Label>
                <Input
                  id="name-1"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="role-1" className="text-xs font-semibold">Subteks / Jabatan</Label>
                <Input
                  id="role-1"
                  name="role"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </Field>
            </FieldGroup>

            <DialogFooter className="pt-2">
              <DialogClose render={<Button variant="outline" type="button" className="h-8 text-xs">Batal</Button>} />
              <Button type="submit" className="h-8 text-xs bg-[#4274D9] hover:bg-[#3561bd] text-white font-medium">Simpan Perubahan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Set TOKEN Akses Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleUpdateToken}>
            <DialogHeader>
              <DialogTitle>Set / Ubah PIN Akses Guru</DialogTitle>
              <DialogDescription>
                Ubah 6 digit PIN Akses Guru untuk login ke aplikasi.
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
                <Label htmlFor="current-token" className="text-xs font-semibold">Token Saat Ini (6 Digit)</Label>
                <Input
                  id="current-token"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={currentPassToken}
                  onChange={(e) => setCurrentPassToken(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="h-9 text-xs font-mono tracking-widest"
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="new-token" className="text-xs font-semibold">Token Baru (6 Digit Angka)</Label>
                <Input
                  id="new-token"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value.replace(/\D/g, ""))}
                  placeholder="6 digit angka"
                  className="h-9 text-xs font-mono tracking-widest"
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="confirm-token" className="text-xs font-semibold">Konfirmasi Token Baru</Label>
                <Input
                  id="confirm-token"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmNewToken}
                  onChange={(e) => setConfirmNewToken(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ulangi 6 digit token baru"
                  className="h-9 text-xs font-mono tracking-widest"
                  required
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" className="h-8 text-xs">Batal</Button>} />
              <Button type="submit" className="h-8 text-xs bg-[#4274D9] hover:bg-[#3561bd] text-white font-medium">Simpan Token Baru</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
