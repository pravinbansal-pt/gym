import { getSessionData, getPreviousPerformance, getPinnedNotes } from "../../_actions";
import { LiveSession } from "./live-session";

interface Props {
  params: Promise<{ id: string }>;
}

type SessionResult = Awaited<ReturnType<typeof getSessionData>>;
type SessionExercise = SessionResult["exercises"][number];
type SessionSet = SessionExercise["sets"][number];
type SessionNote = SessionExercise["notes"][number];
type PrevPerformanceResult = Awaited<ReturnType<typeof getPreviousPerformance>>;
type PinnedNoteResult = Awaited<ReturnType<typeof getPinnedNotes>>[number];

export default async function SessionPage({ params }: Props) {
  const { id } = await params;
  const session = await getSessionData(id);

  // Fetch previous performance and pinned notes for each exercise
  const exerciseDataPromises = session.exercises.map(async (se: SessionExercise) => {
    const [prevPerformance, pinnedNotes] = await Promise.all([
      getPreviousPerformance(se.exerciseId, session.id),
      getPinnedNotes(se.exerciseId),
    ]);
    return {
      sessionExerciseId: se.id,
      exerciseId: se.exerciseId,
      prevPerformance,
      pinnedNotes,
    };
  });

  const exerciseData = await Promise.all(exerciseDataPromises);

  // Get rest seconds config: per-exercise overrides or program default
  const programWorkout = session.programWorkout;
  const restSecondsMap: Record<string, number> = {};

  if (programWorkout) {
    for (const pwe of programWorkout.exercises) {
      restSecondsMap[pwe.exerciseId] =
        pwe.restSeconds ?? session.program?.defaultRestSeconds ?? 90;
    }
  }

  // Get warm-up percentage per exercise
  const warmUpPercentMap: Record<string, number> = {};
  if (programWorkout) {
    for (const pwe of programWorkout.exercises) {
      warmUpPercentMap[pwe.exerciseId] =
        pwe.warmUpPercent ?? session.program?.defaultWarmUpPercent ?? 0.6;
    }
  }

  // Serialize the data for the client component
  const serializedSession = {
    id: session.id,
    name: session.name ?? session.programWorkout?.name ?? "Workout",
    status: session.status,
    startedAt: session.startedAt?.toISOString() ?? null,
    endedAt: session.endedAt?.toISOString() ?? null,
    exercises: session.exercises.map((se: SessionExercise) => {
      const extraData = exerciseData.find(
        (ed: { sessionExerciseId: string }) => ed.sessionExerciseId === se.id
      );
      return {
        id: se.id,
        exerciseId: se.exerciseId,
        exerciseName: se.exercise.name,
        muscleGroup: se.exercise.primaryMuscleGroup.name,
        orderIndex: se.orderIndex,
        restSeconds: restSecondsMap[se.exerciseId] ?? 90,
        warmUpPercent: warmUpPercentMap[se.exerciseId] ?? 0.6,
        sets: se.sets.map((s: SessionSet) => ({
          id: s.id,
          setType: s.setType,
          weight: s.weight,
          reps: s.reps,
          orderIndex: s.orderIndex,
          completedAt: s.completedAt?.toISOString() ?? null,
        })),
        notes: se.notes.map((n: SessionNote) => ({
          id: n.id,
          content: n.content,
          isPinned: n.isPinned,
          createdAt: n.createdAt.toISOString(),
        })),
        prevPerformance: extraData?.prevPerformance
          ? {
              sets: extraData.prevPerformance.sets.map(
                (s: { setType: string; weight: number | null; reps: number | null }) => ({
                  setType: s.setType,
                  weight: s.weight,
                  reps: s.reps,
                })
              ),
              date: extraData.prevPerformance.workoutSession.startedAt?.toISOString() ?? null,
            }
          : null,
        pinnedNotes:
          extraData?.pinnedNotes.map((n: PinnedNoteResult) => ({
            id: n.id,
            content: n.content,
            createdAt: n.createdAt.toISOString(),
          })) ?? [],
      };
    }),
  };

  return <LiveSession initialSession={serializedSession} />;
}
