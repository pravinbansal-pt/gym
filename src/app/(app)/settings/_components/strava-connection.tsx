"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Unplug, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface StravaConnectionProps {
  isConnected: boolean;
  athleteId?: number;
  syncStrava: () => Promise<{ synced: number; skipped: number }>;
  disconnectStrava: () => Promise<void>;
}

export function StravaConnectionCard({
  isConnected,
  athleteId,
  syncStrava,
  disconnectStrava,
}: StravaConnectionProps) {
  const [isSyncing, startSync] = useTransition();
  const [isDisconnecting, startDisconnect] = useTransition();

  function handleSync() {
    startSync(async () => {
      try {
        const result = await syncStrava();
        toast.success(
          `Synced ${result.synced} activities (${result.skipped} skipped)`
        );
      } catch {
        toast.error("Failed to sync Strava activities");
      }
    });
  }

  function handleDisconnect() {
    startDisconnect(async () => {
      try {
        await disconnectStrava();
        toast.success("Strava disconnected");
      } catch {
        toast.error("Failed to disconnect Strava");
      }
    });
  }

  if (!isConnected) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Connect your Strava account to automatically sync your running
          activities.
        </p>
        <Button
          render={<a href="/api/strava/authorize" />}
          className="bg-[#FC4C02] text-white hover:bg-[#e04400]"
        >
          Connect Strava
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-block size-2 rounded-full bg-green-500" />
        <span className="text-sm font-medium">Connected</span>
        {athleteId && (
          <span className="text-xs text-muted-foreground">
            Athlete ID: {athleteId}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
          ) : (
            <RefreshCw className="size-4" data-icon="inline-start" />
          )}
          Sync Now
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={isDisconnecting}
        >
          {isDisconnecting ? (
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
          ) : (
            <Unplug className="size-4" data-icon="inline-start" />
          )}
          Disconnect
        </Button>
      </div>
    </div>
  );
}
