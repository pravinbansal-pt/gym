"use server";

const RAPIDAPI_HOST =
  "edb-with-videos-and-images-by-ascendapi.p.rapidapi.com";

export interface ExerciseDbDetail {
  exerciseId: string;
  name: string;
  imageUrl: string;
  imageUrls: {
    "360p": string;
    "480p": string;
    "720p": string;
    "1080p": string;
  };
  videoUrl: string;
  equipments: string[];
  bodyParts: string[];
  exerciseType: string;
  targetMuscles: string[];
  secondaryMuscles: string[];
  overview: string;
  instructions: string[];
  exerciseTips: string[];
  variations: string[];
  keywords: string[];
  relatedExerciseIds: string[];
}

export interface ExerciseDbSearchResult {
  exerciseId: string;
  name: string;
  imageUrl: string;
}

async function fetchExerciseDb<T>(path: string): Promise<T | null> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://${RAPIDAPI_HOST}/api/v1${path}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": apiKey,
        },
        next: { revalidate: 86400 }, // cache for 24h
      }
    );

    if (!res.ok) return null;

    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function getExerciseDbDetail(
  exerciseDbId: string
): Promise<ExerciseDbDetail | null> {
  return fetchExerciseDb<ExerciseDbDetail>(`/exercises/${exerciseDbId}`);
}

export async function searchExerciseDb(
  query: string
): Promise<ExerciseDbSearchResult[]> {
  const data = await fetchExerciseDb<ExerciseDbSearchResult[]>(
    `/exercises/search?search=${encodeURIComponent(query)}`
  );
  return data ?? [];
}
