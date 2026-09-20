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
  async getProfile(): Promise<UserProfileRecord | null> {
    try {
      const { data, error } = await supabase
        .from("user_profile")
        .select("*")
        .eq("id", "teacher_profile")
        .maybeSingle()

      if (error || !data) return null

      const mapel = data.mapel || DEFAULT_MAPEL
      const waliKelas = data.wali_kelas !== undefined && data.wali_kelas !== null ? data.wali_kelas : DEFAULT_WALI_KELAS
      const kelasAjar = Array.isArray(data.kelas_ajar) && data.kelas_ajar.length > 0 ? data.kelas_ajar : DEFAULT_KELAS_AJAR
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
    } catch (err) {
      return null
    }
  },

  // Save/Upsert profile to Supabase with non-destructive fallback
  async saveProfile(profile: Partial<UserProfileRecord>): Promise<{ success: boolean; error?: string }> {
    try {
      // Get existing profile to merge non-provided fields
      const existing = await this.getProfile()

      const name = profile.name ?? existing?.name ?? DEFAULT_NAME
      const mapel = profile.mapel ?? existing?.mapel ?? DEFAULT_MAPEL
      const kelasAjar = profile.kelasAjar ?? existing?.kelasAjar ?? DEFAULT_KELAS_AJAR
      const waliKelas = profile.waliKelas !== undefined ? profile.waliKelas : (existing?.waliKelas ?? DEFAULT_WALI_KELAS)
      const tahunAjaran = profile.tahunAjaran ?? existing?.tahunAjaran ?? DEFAULT_TAHUN_AJARAN
      const roleTitle = profile.roleTitle ?? generateProfileSubtext({ mapel, waliKelas, kelasAjar })
      const avatarUrl = profile.avatarUrl ?? existing?.avatarUrl ?? DEFAULT_AVATAR
      const wallpaperUrl = profile.wallpaperUrl ?? existing?.wallpaperUrl ?? DEFAULT_WALLPAPER

      const payload: Record<string, any> = {
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

      const { error } = await supabase
        .from("user_profile")
        .upsert([payload], { onConflict: "id" })

      if (error) {
        // Fallback if database migration hasn't added new columns yet
        const isMissingColumnError =
          error.message &&
          (error.message.includes("column") ||
            error.message.includes("schema cache") ||
            error.message.includes("does not exist") ||
            (error as any).code === "PGRST204")

        if (isMissingColumnError) {
          const fallbackPayload = {
            id: "teacher_profile",
            name,
            role_title: roleTitle,
            avatar_url: avatarUrl,
            wallpaper_url: wallpaperUrl,
            updated_at: new Date().toISOString(),
          }
          const { error: fallbackErr } = await supabase
            .from("user_profile")
            .upsert([fallbackPayload], { onConflict: "id" })

          if (fallbackErr) {
            return { success: false, error: fallbackErr.message }
          }
          return { success: true }
        }
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return { success: false, error: errorMsg }
    }
  },
}
