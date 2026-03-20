import { getExercises, getMuscleGroups } from "./_actions";
import { ExerciseListClient } from "./_components/exercise-list-client";

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; muscleGroup?: string; equipment?: string }>;
}) {
  const params = await searchParams;
  const [exercises, muscleGroups] = await Promise.all([
    getExercises({
      search: params.search,
      muscleGroup: params.muscleGroup,
      equipment: params.equipment,
    }),
    getMuscleGroups(),
  ]);

  return (
    <ExerciseListClient
      exercises={exercises}
      muscleGroups={muscleGroups}
      filters={params}
    />
  );
}
