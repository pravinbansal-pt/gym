import { getExercises, getMuscleGroups } from "./_actions";
import { ExerciseListClient } from "./_components/exercise-list-client";

export default async function ExercisesPage() {
  const [exercises, muscleGroups] = await Promise.all([
    getExercises({}),
    getMuscleGroups(),
  ]);

  return (
    <ExerciseListClient
      exercises={exercises}
      muscleGroups={muscleGroups}
    />
  );
}
