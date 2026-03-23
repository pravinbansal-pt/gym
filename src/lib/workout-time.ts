const WARM_UP_SET_SECONDS = 30;
const WORKING_SET_SECONDS = 40;
const EXERCISE_TRANSITION_SECONDS = 60;

type SetInput = {
  setType: "WARM_UP" | "WORKING";
  restSeconds: number;
};

type ExerciseInput = {
  sets: SetInput[];
};

/**
 * Estimate total workout duration in minutes from exercises and their sets.
 * Accounts for per-set execution time, rest between sets, and transition
 * time between exercises.
 */
export function estimateWorkoutMinutes(exercises: ExerciseInput[]): number {
  if (exercises.length === 0) return 0;

  let totalSeconds = 0;

  for (let i = 0; i < exercises.length; i++) {
    const { sets } = exercises[i];
    for (let j = 0; j < sets.length; j++) {
      const set = sets[j];
      const execTime =
        set.setType === "WARM_UP" ? WARM_UP_SET_SECONDS : WORKING_SET_SECONDS;
      totalSeconds += execTime;

      // Rest after every set except the last set of the last exercise
      const isLastSetOfLastExercise =
        i === exercises.length - 1 && j === sets.length - 1;
      if (!isLastSetOfLastExercise) {
        totalSeconds += set.restSeconds;
      }
    }

    // Transition between exercises
    if (i < exercises.length - 1) {
      totalSeconds += EXERCISE_TRANSITION_SECONDS;
    }
  }

  return Math.round(totalSeconds / 60);
}

/** Format estimated minutes as a human-readable string like "~45 min" or "~1h 15min" */
export function formatEstimatedTime(minutes: number): string {
  if (minutes <= 0) return "";
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `~${h}h`;
  return `~${h}h ${m}min`;
}
