import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Dumbbell,
  Pencil,
  Activity,
  Trophy,
  Calendar,
  FileText,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getExerciseById } from "../_actions";
import { getExerciseHistory } from "@/lib/actions/exercises";
import { getNotesForExercise } from "@/lib/actions/notes";
import { ExerciseHistory } from "./_components/exercise-history";
import { ExerciseNotes } from "./_components/exercise-notes";

const EQUIPMENT_LABELS: Record<string, string> = {
  BARBELL: "Barbell",
  DUMBBELL: "Dumbbell",
  MACHINE: "Machine",
  CABLE: "Cable",
  BODYWEIGHT: "Bodyweight",
  SMITH_MACHINE: "Smith Machine",
  EZ_BAR: "EZ Bar",
  KETTLEBELL: "Kettlebell",
  RESISTANCE_BAND: "Resistance Band",
  OTHER: "Other",
};

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [exercise, historyResult, notesResult] = await Promise.all([
    getExerciseById(id),
    getExerciseHistory(id),
    getNotesForExercise(id),
  ]);

  if (!exercise) {
    notFound();
  }

  const history =
    historyResult.success && Array.isArray(historyResult.data)
      ? historyResult.data
      : [];
  const notes =
    notesResult.success && Array.isArray(notesResult.data)
      ? notesResult.data
      : [];

  // Compute real stats from history data
  const totalSessions = history.length;
  const personalRecord = exercise.personalRecords[0];
  const lastSession = exercise.sessionExercises[0]?.workoutSession;

  // Compute best 1RM from history if no personal record exists
  let best1RM = personalRecord?.estimated1RM ?? 0;
  let best1RMDate = personalRecord?.achievedAt ?? null;

  if (!personalRecord && history.length > 0) {
    for (const group of history) {
      const sessionDate = group.session.startedAt ?? group.session.createdAt;
      for (const set of group.sets) {
        const w = set.weight ?? 0;
        const r = set.reps ?? 0;
        if (w > 0 && r > 0) {
          const e1rm = w * (1 + r / 30);
          if (e1rm > best1RM) {
            best1RM = e1rm;
            best1RMDate = sessionDate;
          }
        }
      }
    }
  }

  // Get last performed date from history
  const lastPerformedDate =
    lastSession?.startedAt ??
    (history.length > 0
      ? history[0].session.startedAt ?? history[0].session.createdAt
      : null);

  // Serialize dates for client components
  const serializedHistory = JSON.parse(JSON.stringify(history));
  const serializedNotes = JSON.parse(JSON.stringify(notes));

  return (
    <div className="space-y-6">
      {/* Back link + Header */}
      <div>
        <Link
          href="/exercises"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="size-4" />
          Back to Exercises
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {exercise.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {exercise.primaryMuscleGroup.name}
              </Badge>
              <Badge variant="outline">
                {EQUIPMENT_LABELS[exercise.equipmentType] ?? exercise.equipmentType}
              </Badge>
            </div>
          </div>
          <Link href={`/exercises/${exercise.id}/edit`}>
            <Button variant="outline">
              <Pencil className="size-4" data-icon="inline-start" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sessions
              </CardTitle>
              <p className="text-2xl font-bold">
                {totalSessions > 0 ? totalSessions : "\u2014"}
              </p>
            </div>
          </CardHeader>
        </Card>

        <Card size="sm">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Trophy className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Personal Record (1RM)
              </CardTitle>
              <p className="text-2xl font-bold">
                {best1RM > 0
                  ? `${Math.round(best1RM)}`
                  : "\u2014"}
              </p>
              {best1RMDate && (
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                  }).format(new Date(best1RMDate))}
                </p>
              )}
            </div>
          </CardHeader>
        </Card>

        <Card size="sm">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last Performed
              </CardTitle>
              <p className="text-2xl font-bold">
                {lastPerformedDate
                  ? new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                    }).format(new Date(lastPerformedDate))
                  : "\u2014"}
              </p>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Image + Description */}
        <div className="space-y-4 lg:col-span-1">
          {/* Image Placeholder */}
          <div className="flex aspect-square items-center justify-center rounded-xl bg-muted">
            <Dumbbell className="size-16 text-muted-foreground/30" />
          </div>

          {/* Description */}
          {exercise.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {exercise.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Primary Muscle
                </span>
                <Badge variant="secondary">
                  {exercise.primaryMuscleGroup.name}
                </Badge>
              </div>
              {exercise.secondaryMuscleGroups.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Secondary Muscles
                  </span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {exercise.secondaryMuscleGroups.map((mg) => (
                      <Badge key={mg.id} variant="outline">
                        {mg.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Equipment
                </span>
                <Badge variant="outline">
                  {EQUIPMENT_LABELS[exercise.equipmentType] ?? exercise.equipmentType}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="history">
            <TabsList>
              <TabsTrigger value="history">
                <Clock className="size-4" />
                History
                {totalSessions > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1.5">
                    {totalSessions}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="notes">
                <FileText className="size-4" />
                Notes
                {notes.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1.5">
                    {notes.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="mt-4">
              <ExerciseHistory
                exerciseId={exercise.id}
                history={serializedHistory}
              />
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <ExerciseNotes
                exerciseId={exercise.id}
                initialNotes={serializedNotes}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
