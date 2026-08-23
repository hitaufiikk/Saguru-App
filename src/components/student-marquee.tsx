"use client"

import { cn } from "@/lib/utils"
import { Marquee } from "@/components/ui/marquee"
import { Icon } from "@iconify/react"

interface StudentItem {
  name: string
  classGroup: string
  aspiration: string
  avatarBg: string
  icon: string
}

const students: StudentItem[] = [
  {
    name: "Ahmad Fauzi",
    classGroup: "Kelas 9A",
    aspiration: "Ingin menjadi Software Engineer & Founder Startup Teknologi",
    avatarBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: "solar:code-circle-bold-duotone",
  },
  {
    name: "Siti Nurhaliza",
    classGroup: "Kelas 9A",
    aspiration: "Ingin menjadi Dokter Spesialis Anak & Relawan Kemanusiaan",
    avatarBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: "solar:health-bold-duotone",
  },
  {
    name: "Budi Santoso",
    classGroup: "Kelas 9B",
    aspiration: "Ingin menjadi Pilot Maskapai Nasional & Penjelajah Dunia",
    avatarBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: "solar:rocket-bold-duotone",
  },
  {
    name: "Dewi Lestari",
    classGroup: "Kelas 9B",
    aspiration: "Ingin menjadi Penulis Novel Best Seller & Dosen Sastra",
    avatarBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    icon: "solar:book-bookmark-bold-duotone",
  },
  {
    name: "Rizky Ramadhan",
    classGroup: "Kelas 8C",
    aspiration: "Ingin menjadi Arsitek Ramah Lingkungan & Urban Planner",
    avatarBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    icon: "solar:ruler-cross-bold-duotone",
  },
  {
    name: "Nabila Putri",
    classGroup: "Kelas 8C",
    aspiration: "Ingin menjadi Diplomat Luar Negeri & Penulis Multibahasa",
    avatarBg: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    icon: "solar:global-bold-duotone",
  },
  {
    name: "Rafi Pratama",
    classGroup: "Kelas 9A",
    aspiration: "Ingin menjadi Data Scientist & Ahli Kecerdasan Buatan (AI)",
    avatarBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    icon: "solar:cpu-bold-duotone",
  },
  {
    name: "Zahra Amalia",
    classGroup: "Kelas 9B",
    aspiration: "Ingin menjadi Psikolog Anak & Aktivis Pendidikan",
    avatarBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    icon: "solar:user-heart-bold-duotone",
  },
]

const firstRow = students.slice(0, students.length / 2)
const secondRow = students.slice(students.length / 2)

const StudentCard = ({ name, classGroup, aspiration, avatarBg, icon }: StudentItem) => {
  return (
    <figure
      className={cn(
        "relative w-72 sm:w-80 cursor-pointer overflow-hidden rounded-xl border p-4 transition-all duration-200 hover:scale-[1.02]",
        "border-border/60 bg-card text-card-foreground hover:bg-muted/40 shadow-xs"
      )}
    >
      <div className="flex flex-row items-center gap-3">
        <div className={cn("p-2.5 rounded-full border shrink-0", avatarBg)}>
          <Icon icon={icon} width={20} height={20} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <figcaption className="text-sm font-semibold text-foreground truncate">
              {name}
            </figcaption>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border shrink-0">
              {classGroup}
            </span>
          </div>
        </div>
      </div>
      <blockquote className="mt-3 text-xs text-foreground/90 leading-relaxed bg-muted/30 p-2.5 rounded-lg border border-border/40 font-medium">
        🎯 <span className="text-muted-foreground">Cita-cita:</span> &ldquo;{aspiration}&rdquo;
      </blockquote>
    </figure>
  )
}

export default function StudentMarquee() {
  return (
    <div className="max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 w-full space-y-4">
      {/* Header judul section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Icon icon="solar:stars-minimalistic-bold-duotone" width={20} height={20} />
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-bold text-foreground">
              Impian & Cita-Cita Siswa
            </h4>
            <p className="text-xs text-muted-foreground">
              Aspirasi dan masa depan generasi penerus bangsa
            </p>
          </div>
        </div>
      </div>

      {/* Marquee container */}
      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-card/50 py-4 shadow-xs">
        <Marquee pauseOnHover className="[--duration:30s]">
          {firstRow.map((student, idx) => (
            <StudentCard key={idx} {...student} />
          ))}
        </Marquee>
        <Marquee reverse pauseOnHover className="[--duration:30s]">
          {secondRow.map((student, idx) => (
            <StudentCard key={idx} {...student} />
          ))}
        </Marquee>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-gradient-to-r from-background to-transparent"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-gradient-to-l from-background to-transparent"></div>
      </div>
    </div>
  )
}
