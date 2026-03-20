import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";

type Workout = {
  name: string;
  dayIndex: number;
};

export function WorkoutHeader({
  workout,
  programName,
  phaseName,
}: {
  workout: Workout;
  programName: string;
  phaseName: string | null;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{programName}</span>
        {phaseName && (
          <>
            <span>/</span>
            <Badge variant="secondary" className="text-xs">
              <Layers className="size-3" />
              {phaseName}
            </Badge>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{workout.name}</h1>
        <Badge variant="outline" className="text-sm">
          Day {workout.dayIndex + 1}
        </Badge>
      </div>
    </div>
  );
}
