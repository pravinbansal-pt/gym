import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProgramHeader } from "./_components/program-header";
import { ProgramDefaults } from "./_components/program-defaults";
import { PhasesSection } from "./_components/phases-section";
import { WorkoutsSection } from "./_components/workouts-section";
import { NextWorkoutIndicator } from "./_components/next-workout-indicator";

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const program = await db.program.findUnique({
    where: { id },
    include: {
      phases: { orderBy: { orderIndex: "asc" } },
      workouts: {
        include: {
          _count: { select: { exercises: true } },
          phase: true,
        },
        orderBy: { orderIndex: "asc" },
      },
      sessions: {
        where: { status: "COMPLETED" },
        orderBy: { endedAt: "desc" },
        take: 1,
        select: { programWorkoutId: true, endedAt: true },
      },
    },
  });

  if (!program) notFound();

  const lastCompletedWorkoutId = program.sessions[0]?.programWorkoutId ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" render={<Link href="/programs" />}>
          <ArrowLeft className="size-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Back to Programs</span>
      </div>

      <ProgramHeader program={program} />

      <Separator />

      <ProgramDefaults program={program} />

      <Separator />

      {program.type === "PERIODIZED" && (
        <>
          <PhasesSection
            programId={program.id}
            phases={program.phases}
          />
          <Separator />
        </>
      )}

      {program.type === "SIMPLE" && lastCompletedWorkoutId && (
        <NextWorkoutIndicator
          workouts={program.workouts}
          lastCompletedWorkoutId={lastCompletedWorkoutId}
        />
      )}

      <WorkoutsSection
        program={program}
        workouts={program.workouts}
        phases={program.phases}
        lastCompletedWorkoutId={lastCompletedWorkoutId}
      />
    </div>
  );
}
