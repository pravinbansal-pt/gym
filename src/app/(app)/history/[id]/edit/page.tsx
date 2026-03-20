import { getSessionDetail } from "../../../workouts/_actions";
import { EditSession } from "./edit-session";

interface Props {
  params: Promise<{ id: string }>;
}

type DetailResult = Awaited<ReturnType<typeof getSessionDetail>>;
type DetailExercise = DetailResult["exercises"][number];
type DetailSet = DetailExercise["sets"][number];
type DetailNote = DetailExercise["notes"][number];

export default async function EditSessionPage({ params }: Props) {
  const { id } = await params;
  const session = await getSessionDetail(id);

  const durationSeconds =
    session.startedAt && session.endedAt
      ? Math.floor(
          (new Date(session.endedAt).getTime() -
            new Date(session.startedAt).getTime()) /
            1000
        )
      : 0;

  const serialized = {
    id: session.id,
    name: session.name ?? "Workout",
    status: session.status,
    startedAt: session.startedAt?.toISOString() ?? null,
    endedAt: session.endedAt?.toISOString() ?? null,
    durationSeconds,
    programName: session.program?.name ?? null,
    exercises: session.exercises.map((ex: DetailExercise) => ({
      id: ex.id,
      exerciseId: ex.exerciseId,
      exerciseName: ex.exercise.name,
      muscleGroup: ex.exercise.primaryMuscleGroup.name,
      orderIndex: ex.orderIndex,
      sets: ex.sets.map((s: DetailSet) => ({
        id: s.id,
        setType: s.setType as "WARM_UP" | "WORKING",
        weight: s.weight,
        reps: s.reps,
        orderIndex: s.orderIndex,
        completedAt: s.completedAt?.toISOString() ?? null,
      })),
      notes: ex.notes.map((n: DetailNote) => ({
        id: n.id,
        content: n.content,
        isPinned: n.isPinned,
        createdAt: n.createdAt.toISOString(),
      })),
    })),
  };

  return <EditSession initialSession={serialized} />;
}
