import { getCardioActivities, getCardioStats } from "./_actions";
import { getAppSettings, getStravaStatus, syncStrava } from "../settings/_actions";
import { CardioStats } from "./_components/cardio-stats";
import { ActivityList } from "./_components/activity-list";
import { AddActivityDialog } from "./_components/add-activity-dialog";
import { SyncButton } from "./_components/sync-button";

export default async function CardioPage() {
  const [activities, stats, settings, stravaStatus] = await Promise.all([
    getCardioActivities(),
    getCardioStats(),
    getAppSettings(),
    getStravaStatus(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cardio</h1>
          <p className="mt-1 text-muted-foreground">
            Track your running and cardio activities.
          </p>
        </div>
        <div className="flex gap-2">
          {stravaStatus.connected && <SyncButton syncStrava={syncStrava} />}
          <AddActivityDialog />
        </div>
      </div>

      <CardioStats
        weekDistance={stats.weekDistance}
        weekRuns={stats.weekRuns}
        weekAvgPace={stats.weekAvgPace}
        totalDistance={stats.totalDistance}
        distanceUnit={settings.defaultDistanceUnit}
      />

      <div>
        <h2 className="mb-3 text-xl font-semibold tracking-tight">
          Recent Activities
        </h2>
        <ActivityList
          activities={activities}
          distanceUnit={settings.defaultDistanceUnit}
        />
      </div>
    </div>
  );
}
