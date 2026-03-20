"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Timer,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  List,
  Pencil,
  Weight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

// ─── Types ──────────────────────────────────────────────────────────

interface SessionSet {
  id: string;
  setType: string;
  weight: number | null;
  reps: number | null;
}

interface SessionExercise {
  id: string;
  name: string;
  muscleGroup: string;
  sets: SessionSet[];
}

interface HistorySession {
  id: string;
  name: string;
  programName: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  exerciseCount: number;
  totalVolume: number;
  totalSets: number;
  exercises: SessionExercise[];
}

// ─── Utility Functions ──────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "--";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "--";
  return new Date(isoString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDateLong(isoString: string | null): string {
  if (!isoString) return "--";
  return new Date(isoString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(isoString: string | null): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Main Component ─────────────────────────────────────────────────

export function HistoryView({
  sessions,
  sessionDates,
}: {
  sessions: HistorySession[];
  sessionDates: string[];
}) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Parse session dates for calendar highlighting
  const sessionDateSet = useMemo(
    () => new Set(sessionDates),
    [sessionDates]
  );

  // Filter sessions for selected date in calendar view
  const filteredSessions = useMemo(() => {
    if (!selectedDate) return sessions;
    const dateStr = selectedDate.toISOString().split("T")[0];
    return sessions.filter((s) => {
      if (!s.startedAt) return false;
      return s.startedAt.split("T")[0] === dateStr;
    });
  }, [sessions, selectedDate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">History</h1>
          <p className="mt-1 text-muted-foreground">
            {sessions.length} completed workout{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list" className="gap-1.5">
            <List className="size-3.5" />
            List
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5">
            <CalendarIcon className="size-3.5" />
            Calendar
          </TabsTrigger>
        </TabsList>

        {/* List View */}
        <TabsContent value="list">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Dumbbell className="size-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  No completed workouts yet. Start a session to see your history here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isExpanded={expandedSession === session.id}
                  onToggle={() =>
                    setExpandedSession(
                      expandedSession === session.id ? null : session.id
                    )
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar">
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
            <Card className="w-fit">
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    hasWorkout: (date) => {
                      const dateStr = date.toISOString().split("T")[0];
                      return sessionDateSet.has(dateStr);
                    },
                  }}
                  modifiersClassNames={{
                    hasWorkout:
                      "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:size-1 after:rounded-full after:bg-primary",
                  }}
                />
              </CardContent>
            </Card>

            <div>
              {selectedDate ? (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold">
                    {formatDateLong(selectedDate.toISOString())}
                  </h2>
                  {filteredSessions.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground text-sm">
                          No workouts on this day.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredSessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        isExpanded={expandedSession === session.id}
                        onToggle={() =>
                          setExpandedSession(
                            expandedSession === session.id ? null : session.id
                          )
                        }
                      />
                    ))
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CalendarIcon className="size-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground text-sm">
                      Select a date to view workouts. Days with workouts have a dot indicator.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Session Card ───────────────────────────────────────────────────

function SessionCard({
  session,
  isExpanded,
  onToggle,
}: {
  session: HistorySession;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center min-w-[3rem]">
                  <span className="text-xs text-muted-foreground uppercase">
                    {session.startedAt
                      ? new Date(session.startedAt).toLocaleDateString("en-US", {
                          month: "short",
                        })
                      : ""}
                  </span>
                  <span className="text-xl font-bold leading-tight">
                    {session.startedAt
                      ? new Date(session.startedAt).getDate()
                      : "--"}
                  </span>
                </div>

                <Separator orientation="vertical" className="h-8" />

                <div className="text-left">
                  <CardTitle className="text-sm font-semibold">
                    {session.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-3 mt-0.5">
                    {session.programName && (
                      <>
                        <span className="text-xs">{session.programName}</span>
                        <Separator orientation="vertical" className="h-3" />
                      </>
                    )}
                    <span className="flex items-center gap-1 text-xs">
                      <Timer className="size-3" />
                      {formatDuration(session.durationSeconds)}
                    </span>
                    <Separator orientation="vertical" className="h-3" />
                    <span className="text-xs">
                      {session.exerciseCount} exercises
                    </span>
                    <Separator orientation="vertical" className="h-3" />
                    <span className="text-xs">
                      {session.totalVolume.toLocaleString()} kg
                    </span>
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronUp className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold">
                  {formatDuration(session.durationSeconds)}
                </div>
                <div className="text-xs text-muted-foreground">Duration</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">
                  {session.exerciseCount}
                </div>
                <div className="text-xs text-muted-foreground">Exercises</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{session.totalSets}</div>
                <div className="text-xs text-muted-foreground">Sets</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">
                  {session.totalVolume.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Volume (kg)</div>
              </div>
            </div>

            <Separator />

            {/* Exercises Breakdown */}
            <div className="space-y-3">
              {session.exercises.map((exercise) => (
                <div key={exercise.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {exercise.name}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {exercise.muscleGroup}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {exercise.sets.map((set, i) => (
                      <div
                        key={set.id}
                        className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums"
                      >
                        {set.setType === "WARM_UP" && (
                          <span className="text-muted-foreground">W</span>
                        )}
                        <span className="font-medium">
                          {set.weight ?? 0}
                        </span>
                        <span className="text-muted-foreground">kg</span>
                        <span className="text-muted-foreground mx-0.5">x</span>
                        <span className="font-medium">{set.reps ?? 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" render={
                <Link href={`/history/${session.id}/edit`} />
              }>
                <Pencil className="size-3.5" />
                Edit Session
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">
                {session.startedAt && (
                  <>
                    {formatDate(session.startedAt)} at{" "}
                    {formatTime(session.startedAt)}
                    {session.endedAt && (
                      <> - {formatTime(session.endedAt)}</>
                    )}
                  </>
                )}
              </span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
