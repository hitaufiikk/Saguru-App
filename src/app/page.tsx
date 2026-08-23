import { WelcomeBanner } from "@/components/welcome-banner";
import StatisticsCard from "@/components/shadcn-space/card/card-06";
import QuickActionsSchedule from "@/components/shadcn-space/card/quick-actions-schedule";
import { MarqueeDemo } from "@/components/marquee-demo";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground font-sans pt-4 sm:pt-6 pb-20 space-y-6">
      <WelcomeBanner />
      <StatisticsCard />
      <QuickActionsSchedule />
      <MarqueeDemo />
    </main>
  );
}
