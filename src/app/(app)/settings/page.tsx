import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAppSettings,
  updateWeightUnit,
  updateDistanceUnit,
  getStravaStatus,
  syncStrava,
  disconnectStrava,
} from "./_actions";
import { SettingsForm } from "./_components/settings-form";
import { DistanceUnitForm } from "./_components/distance-unit-form";
import { StravaConnectionCard } from "./_components/strava-connection";
import { UsernameChangeForm } from "./_components/username-form";
import { getSession } from "@/lib/get-session";

export default async function SettingsPage() {
  const [settings, stravaStatus, session] = await Promise.all([
    getAppSettings(),
    getStravaStatus(),
    getSession(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Configure your gym tracker preferences.
        </p>
      </div>

      {session?.user?.username && (
        <Card>
          <CardHeader>
            <CardTitle>Username</CardTitle>
            <CardDescription>
              Change your username. You can reclaim your own previous usernames.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsernameChangeForm currentUsername={session.user.username} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Weight Unit</CardTitle>
          <CardDescription>
            Choose the default unit for weight displays across the app.
            You can override this per exercise.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            defaultWeightUnit={settings.defaultWeightUnit}
            updateWeightUnit={updateWeightUnit}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distance Unit</CardTitle>
          <CardDescription>
            Choose the default unit for distance and pace displays.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DistanceUnitForm
            defaultDistanceUnit={settings.defaultDistanceUnit}
            updateDistanceUnit={updateDistanceUnit}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Strava</CardTitle>
          <CardDescription>
            Sync your running activities from Strava.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StravaConnectionCard
            isConnected={stravaStatus.connected}
            athleteId={
              stravaStatus.connected ? stravaStatus.athleteId : undefined
            }
            syncStrava={syncStrava}
            disconnectStrava={disconnectStrava}
          />
        </CardContent>
      </Card>
    </div>
  );
}
