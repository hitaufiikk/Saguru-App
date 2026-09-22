import { supabase } from "@/lib/supabase"

export interface UserProfileRecord {
  id: string
  name: string
  roleTitle: string
  avatarUrl: string
  wallpaperUrl: string
  mapel: string
  kelasAjar: string[]
  waliKelas: string
  tahunAjaran: string
}

export const DEFAULT_AVATAR = "https://avatars.githubusercontent.com/u/124599?v=4"
export const DEFAULT_WALLPAPER = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop"
export const DEFAULT_NAME = "Devy, S.Pd."
export const DEFAULT_MAPEL = "Matematika"
export const DEFAULT_KELAS_AJAR = ["8I", "8H", "9A", "9B"]
export const DEFAULT_WALI_KELAS = "9A"
export const DEFAULT_TAHUN_AJARAN = "2025/2026"

/**
 * Generate profile role/subtext automatically from assignment settings.
 * Ensures the teacher is NOT designated as wali kelas for all taught classes,
 * only for the specifically selected wali kelas.
 */
export function generateProfileSubtext(params: {
  mapel?: string
  waliKelas?: string
  kelasAjar?: string[]
}): string {
  const mapelName = params.mapel?.trim() || DEFAULT_MAPEL
  const mapelPart = `Guru ${mapelName}`
  const wali = params.waliKelas?.trim()

  if (wali && wali.toLowerCase() !== "none" && wali !== "") {
    return `Wali Kelas ${wali.toUpperCase()} • ${mapelPart}`
  }
  return mapelPart
}

export const profileService = {
  // Fetch profile from Supabase
  async getProfile(client = supabase): Promise<UserProfileRecord | null> {
    const { data, error } = await client
      .from("user_profile")
      .select("id,name,role_title,avatar_url,wallpaper_url,mapel,kelas_ajar,wali_kelas,tahun_ajaran")
      .eq("id", "teacher_profile")
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) return null

    const mapel = data.mapel || DEFAULT_MAPEL
    const waliKelas = data.wali_kelas !== undefined && data.wali_kelas !== null ? data.wali_kelas : DEFAULT_WALI_KELAS
    const kelasAjar = Array.isArray(data.kelas_ajar) ? data.kelas_ajar : DEFAULT_KELAS_AJAR
    const tahunAjaran = data.tahun_ajaran || DEFAULT_TAHUN_AJARAN

    return {
      id: data.id,
      name: data.name || DEFAULT_NAME,
      roleTitle: data.role_title || generateProfileSubtext({ mapel, waliKelas, kelasAjar }),
      avatarUrl: data.avatar_url || DEFAULT_AVATAR,
      wallpaperUrl: data.wallpaper_url || DEFAULT_WALLPAPER,
      mapel,
      kelasAjar,
      waliKelas,
      tahunAjaran,
    }
  },

  // Save all fields together; never retry with an incomplete payload.
  async saveProfile(profile: Partial<UserProfileRecord>, client = supabase): Promise<{ success: boolean; error?: string }> {
    try {
      // Get existing profile to merge non-provided fields
      const existing = await this.getProfile(client)

      const name = profile.name ?? existing?.name ?? DEFAULT_NAME
      const mapel = profile.mapel ?? existing?.mapel ?? DEFAULT_MAPEL
      const kelasAjar = profile.kelasAjar ?? existing?.kelasAjar ?? DEFAULT_KELAS_AJAR
      const waliKelas = profile.waliKelas !== undefined ? profile.waliKelas : (existing?.waliKelas ?? DEFAULT_WALI_KELAS)
      const tahunAjaran = profile.tahunAjaran ?? existing?.tahunAjaran ?? DEFAULT_TAHUN_AJARAN
      const roleTitle = profile.roleTitle ?? generateProfileSubtext({ mapel, waliKelas, kelasAjar })
      const avatarUrl = profile.avatarUrl ?? existing?.avatarUrl ?? DEFAULT_AVATAR
      const wallpaperUrl = profile.wallpaperUrl ?? existing?.wallpaperUrl ?? DEFAULT_WALLPAPER

      const payload: Record<string, unknown> = {
        id: "teacher_profile",
        name,
        role_title: roleTitle,
        avatar_url: avatarUrl,
        wallpaper_url: wallpaperUrl,
        mapel,
        kelas_ajar: kelasAjar,
        wali_kelas: waliKelas,
        tahun_ajaran: tahunAjaran,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await client
        .from("user_profile")
        .upsert([payload], { onConflict: "id" })
        .select("id")
        .single()

      if (error) {
        return { success: false, error: error.message }
      }
      if (data?.id !== "teacher_profile") {
        return { success: false, error: "Server belum mengonfirmasi penyimpanan profil. Silakan coba lagi." }
      }

      return { success: true }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return { success: false, error: errorMsg }
    }
  },
}
