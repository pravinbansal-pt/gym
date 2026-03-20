"use client";

import { useState } from "react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dumbbell } from "lucide-react";

const chartConfig = {
  estimated1RM: {
    label: "Est. 1RM (kg)",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

interface ExerciseOption {
  id: string;
  name: string;
  muscleGroup: string;
}

interface StrengthTrendsChartProps {
  exercises: ExerciseOption[];
  strengthData: Record<string, Array<{ date: string; estimated1RM: number }>>;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function StrengthTrendsChart({
  exercises,
  strengthData,
}: StrengthTrendsChartProps) {
  const [selectedExercise, setSelectedExercise] = useState<string>(
    exercises[0]?.id ?? ""
  );

  const handleExerciseChange = (value: string | null) => {
    if (value) setSelectedExercise(value);
  };

  const data = (strengthData[selectedExercise] ?? []).map((d) => ({
    ...d,
    dateLabel: formatDateLabel(d.date),
  }));

  const selectedName =
    exercises.find((e) => e.id === selectedExercise)?.name ?? "";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Dumbbell className="size-4 text-muted-foreground" />
        <Select value={selectedExercise} onValueChange={handleExerciseChange}>
          <SelectTrigger className="w-auto min-w-48">
            <SelectValue placeholder="Select an exercise" />
          </SelectTrigger>
          <SelectContent>
            {exercises.map((ex) => (
              <SelectItem key={ex.id} value={ex.id}>
                {ex.name}
                <span className="ml-2 text-muted-foreground">
                  ({ex.muscleGroup})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No data for this exercise yet.
        </p>
      ) : data.length === 1 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <p className="text-2xl font-bold tabular-nums">
            {data[0].estimated1RM} kg
          </p>
          <p className="text-sm text-muted-foreground">
            Single record for {selectedName} on{" "}
            {formatDateLabel(data[0].date)}
          </p>
        </div>
      ) : (
        <ChartContainer
          config={chartConfig}
          className="aspect-[3/1] w-full"
        >
          <LineChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: -12 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="dateLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              domain={["auto", "auto"]}
              tickFormatter={(value: number) => `${value}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [`${value} kg`, "Est. 1RM"]}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="estimated1RM"
              stroke="var(--color-estimated1RM)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      )}
    </div>
  );
}
