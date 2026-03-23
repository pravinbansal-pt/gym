"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SyncButton({
  syncStrava,
}: {
  syncStrava: () => Promise<{ synced: number; skipped: number }>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    startTransition(async () => {
      try {
        const result = await syncStrava();
        toast.success(
          `Synced ${result.synced} activities (${result.skipped} skipped)`
        );
      } catch {
        toast.error("Failed to sync from Strava");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSync} disabled={isPending}>
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />
      ) : (
        <RefreshCw className="size-3.5" data-icon="inline-start" />
      )}
      Sync Strava
    </Button>
  );
}
