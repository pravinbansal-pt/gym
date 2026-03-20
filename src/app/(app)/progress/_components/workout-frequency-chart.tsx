"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  workouts: {
    label: "Workouts",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

interface WorkoutFrequencyChartProps {
  data: Array<{ week: string; workouts: number }>;
}

export function WorkoutFrequencyChart({ data }: WorkoutFrequencyChartProps) {
  return (
    <ChartContainer config={chartConfig} className="aspect-[3/1] w-full">
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          allowDecimals={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [
                `${value} ${Number(value) === 1 ? "workout" : "workouts"}`,
                "Frequency",
              ]}
            />
          }
        />
        <Bar
          dataKey="workouts"
          fill="var(--color-workouts)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
