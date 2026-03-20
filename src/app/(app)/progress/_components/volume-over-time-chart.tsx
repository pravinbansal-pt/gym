"use client";

import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
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

interface VolumeOverTimeChartProps {
  data: Array<{ week: string; volume: number }>;
}

export function VolumeOverTimeChart({ data }: VolumeOverTimeChartProps) {
  return (
    <ChartContainer config={chartConfig} className="aspect-[3/1] w-full">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-volume)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-volume)" stopOpacity={0} />
          </linearGradient>
        </defs>
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
          tickFormatter={(value: number) =>
            value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)
          }
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [
                `${Number(value).toLocaleString()} kg`,
                "Volume",
              ]}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="volume"
          stroke="var(--color-volume)"
          strokeWidth={2}
          fill="url(#volumeGradient)"
        />
      </AreaChart>
    </ChartContainer>
  );
}
