import { WelcomeBanner } from "@/components/welcome-banner";
import StatisticsCard from "@/components/shadcn-space/card/card-06";
import QuickActionsSchedule from "@/components/shadcn-space/card/quick-actions-schedule";
import { MarqueeDemo } from "@/components/marquee-demo";

export default function Home() {
  return (
    <main className="flex-1 w-full bg-background text-foreground font-sans pt-3 sm:pt-6 pb-6 sm:pb-10 space-y-4 sm:space-y-6">
      <WelcomeBanner />
      <StatisticsCard />
      <QuickActionsSchedule />
      <MarqueeDemo />
    </main>
  );
}
