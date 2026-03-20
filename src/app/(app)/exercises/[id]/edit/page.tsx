import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getExerciseById, getMuscleGroups } from "../../_actions";
import { EditExerciseForm } from "./_components/edit-exercise-form";

export default async function EditExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [exercise, muscleGroups] = await Promise.all([
    getExerciseById(id),
    getMuscleGroups(),
  ]);

  if (!exercise) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/exercises/${exercise.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="size-4" />
          Back to {exercise.name}
        </Link>

        <h1 className="text-3xl font-bold tracking-tight">Edit Exercise</h1>
        <p className="mt-1 text-muted-foreground">
          Update the details for {exercise.name}.
        </p>
      </div>

      <EditExerciseForm exercise={exercise} muscleGroups={muscleGroups} />
    </div>
  );
}
