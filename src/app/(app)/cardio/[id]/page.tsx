import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCardioActivity } from "../_actions";
import { getAppSettings } from "../../settings/_actions";
import { ActivityDetail } from "./_components/activity-detail";

export default async function CardioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [activity, settings] = await Promise.all([
    getCardioActivity(id),
    getAppSettings(),
  ]);

  if (!activity) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/cardio" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Back to Cardio</span>
      </div>

      <ActivityDetail
        activity={activity}
        distanceUnit={settings.defaultDistanceUnit}
      />
    </div>
  );
}
