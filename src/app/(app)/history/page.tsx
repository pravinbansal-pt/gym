import { getCompletedSessions, getSessionDates } from "../workouts/_actions";
import { HistoryView } from "./history-view";

type SessionsResult = Awaited<ReturnType<typeof getCompletedSessions>>;
type CompletedSession = SessionsResult[number];
type CompletedExercise = CompletedSession["exercises"][number];
type CompletedSet = CompletedExercise["sets"][number];

export default async function HistoryPage() {
  const [sessions, sessionDates] = await Promise.all([
    getCompletedSessions(),
    getSessionDates(),
  ]);

  // Serialize for client component
  const serializedSessions = sessions.map((s: CompletedSession) => {
    const totalVolume = s.exercises.reduce(
      (acc: number, ex: CompletedExercise) =>
        acc +
        ex.sets.reduce(
          (sum: number, set: CompletedSet) =>
            sum + (set.weight ?? 0) * (set.reps ?? 0),
          0
        ),
      0
    );

    const durationSeconds =
      s.startedAt && s.endedAt
        ? Math.floor(
            (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) /
              1000
          )
        : 0;

    return {
      id: s.id,
      name: s.name ?? "Workout",
      programName: s.program?.name ?? null,
      startedAt: s.startedAt?.toISOString() ?? null,
      endedAt: s.endedAt?.toISOString() ?? null,
      durationSeconds,
      exerciseCount: s.exercises.length,
      totalVolume: Math.round(totalVolume),
      totalSets: s.exercises.reduce(
        (acc: number, ex: CompletedExercise) => acc + ex.sets.length,
        0
      ),
      exercises: s.exercises.map((ex: CompletedExercise) => ({
        id: ex.id,
        name: ex.exercise.name,
        muscleGroup: ex.exercise.primaryMuscleGroup.name,
        sets: ex.sets.map((set: CompletedSet) => ({
          id: set.id,
          setType: set.setType,
          weight: set.weight,
          reps: set.reps,
        })),
      })),
    };
  });

  return (
    <HistoryView
      sessions={serializedSessions}
      sessionDates={sessionDates}
    />
  );
}
