import { supabase } from "@/lib/supabase"

export interface UserProfileRecord {
  id: string
  name: string
  roleTitle: string
  avatarUrl: string
  wallpaperUrl: string
}

const DEFAULT_AVATAR = "https://avatars.githubusercontent.com/u/124599?v=4"
const DEFAULT_WALLPAPER = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop"

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

      return {
        id: data.id,
        name: data.name || "Devy, S.Pd.",
        roleTitle: data.role_title || "Wali Kelas 9A • Guru Matematika",
        avatarUrl: data.avatar_url || DEFAULT_AVATAR,
        wallpaperUrl: data.wallpaper_url || DEFAULT_WALLPAPER,
      }
    } catch (err) {
      return null
    }
  },

  // Save/Upsert profile to Supabase
  async saveProfile(profile: Partial<UserProfileRecord>): Promise<boolean> {
    try {
      const { error } = await supabase.from("user_profile").upsert(
        [
          {
            id: "teacher_profile",
            name: profile.name,
            role_title: profile.roleTitle,
            avatar_url: profile.avatarUrl,
            wallpaper_url: profile.wallpaperUrl,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "id" }
      )

      if (error) {
        console.warn("Supabase profile save warning:", error.message)
      }
      return !error
    } catch (err) {
      return false
    }
  },
}
