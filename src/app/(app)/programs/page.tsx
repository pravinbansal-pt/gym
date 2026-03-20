import { db } from "@/lib/db";
import Link from "next/link";
import {
  Plus,
  Dumbbell,
  Layers,
  RotateCcw,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreateProgramDialog } from "./_components/create-program-dialog";

export default async function ProgramsPage() {
  const programs = await db.program.findMany({
    include: {
      _count: { select: { workouts: true } },
      phases: { orderBy: { orderIndex: "asc" } },
      sessions: {
        where: { status: "COMPLETED" },
        orderBy: { endedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Programs</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your training programs and workout schedules.
          </p>
        </div>
        <CreateProgramDialog />
      </div>

      {programs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <Dumbbell className="size-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No programs yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first training program to organize your workouts and
              track your progress.
            </p>
            <div className="mt-6">
              <CreateProgramDialog />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program: typeof programs[number]) => (
            <Link key={program.id} href={`/programs/${program.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-1">
                      {program.name}
                    </CardTitle>
                    <div className="flex shrink-0 gap-1.5">
                      {program.isActive && (
                        <Badge variant="default">
                          <Zap className="size-3" />
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                  {program.description && (
                    <CardDescription className="line-clamp-2">
                      {program.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1.5 mb-3">
                    {program.type === "PERIODIZED" ? (
                      <Badge variant="secondary">
                        <Layers className="size-3" />
                        Periodized
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <RotateCcw className="size-3" />
                        Simple
                      </Badge>
                    )}
                  </div>
                  <Separator className="mb-3" />
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Dumbbell className="size-3.5" />
                      <span>
                        {program._count.workouts}{" "}
                        {program._count.workouts === 1
                          ? "workout"
                          : "workouts"}
                      </span>
                    </div>
                    {program.type === "PERIODIZED" &&
                      program.phases.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Layers className="size-3.5" />
                          <span>
                            {program.phases.length}{" "}
                            {program.phases.length === 1
                              ? "phase"
                              : "phases"}
                          </span>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
