"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  volume: {
    label: "Volume (kg)",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

interface WeeklyVolumeChartProps {
  data: Array<{ day: string; volume: number }>;
}

export function WeeklyVolumeChart({ data }: WeeklyVolumeChartProps) {
  return (
    <ChartContainer config={chartConfig} className="aspect-[2/1] w-full">
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          tickFormatter={(value: number) =>
            value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)
          }
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [`${Number(value).toLocaleString()} kg`, "Volume"]}
            />
          }
        />
        <Bar
          dataKey="volume"
          fill="var(--color-volume)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
