"use client";

import { useState } from "react";
import { Trophy, Filter } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PRRecord {
  exerciseId: string;
  exerciseName: string;
  muscleGroupId: string;
  muscleGroupName: string;
  equipmentType: string;
  bestWeight: number;
  bestReps: number;
  estimated1RM: number;
  achievedAt: string;
  isRecent: boolean;
}

interface MuscleGroup {
  id: string;
  name: string;
}

interface RecordsViewProps {
  records: PRRecord[];
  muscleGroups: MuscleGroup[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RecordsView({ records, muscleGroups }: RecordsViewProps) {
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>("all");

  const handleMuscleGroupChange = (value: string | null) => {
    setSelectedMuscleGroup(value ?? "all");
  };

  const filteredRecords =
    selectedMuscleGroup === "all"
      ? records
      : records.filter((r) => r.muscleGroupId === selectedMuscleGroup);

  // Group by muscle group
  const grouped = filteredRecords.reduce<Record<string, PRRecord[]>>(
    (acc, record) => {
      const key = record.muscleGroupName;
      if (!acc[key]) acc[key] = [];
      acc[key].push(record);
      return acc;
    },
    {}
  );

  const groupNames = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="size-4 text-muted-foreground" />
        <Select value={selectedMuscleGroup} onValueChange={handleMuscleGroupChange}>
          <SelectTrigger>
            <SelectValue placeholder="All muscle groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Muscle Groups</SelectItem>
            {muscleGroups.map((mg) => (
              <SelectItem key={mg.id} value={mg.id}>
                {mg.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredRecords.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <Trophy className="size-10 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium">No personal records yet</p>
                <p className="text-sm text-muted-foreground">
                  Complete some workouts to start tracking your PRs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        groupNames.map((groupName) => (
          <Card key={groupName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {groupName}
                <Badge variant="secondary">
                  {grouped[groupName].length}{" "}
                  {grouped[groupName].length === 1 ? "exercise" : "exercises"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exercise</TableHead>
                    <TableHead className="text-right">Est. 1RM</TableHead>
                    <TableHead className="text-right">Best Weight</TableHead>
                    <TableHead className="text-right">Best Reps</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped[groupName].map((record) => (
                    <TableRow key={record.exerciseId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {record.exerciseName}
                          </span>
                          {record.isRecent && (
                            <Badge
                              variant="default"
                              className="bg-amber-500 text-[10px] text-white hover:bg-amber-500"
                            >
                              New!
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {record.equipmentType.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {record.estimated1RM} kg
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {record.bestWeight} kg
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {record.bestReps}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDate(record.achievedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
