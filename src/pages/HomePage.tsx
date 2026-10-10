import { Hero } from '@/components/home/Hero';
import { InspirationCard, ProgressOverview, StageStrip, SummaryCard, UpcomingTasks } from '@/components/home/Overview';
import { Roadmap } from '@/components/home/Roadmap';

export function HomePage() {
  return (
    <div className="space-y-5 lg:space-y-6">
      <Hero />
      <div className="grid gap-5 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <SummaryCard />
        <ProgressOverview />
      </div>
      <StageStrip />
      <div className="grid gap-5 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <UpcomingTasks />
        <InspirationCard />
      </div>
      <Roadmap />
    </div>
  );
}
