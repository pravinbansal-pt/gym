"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Settings, ChevronDown, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { updateProgramDefaults } from "../../_actions";

type Program = {
  id: string;
  defaultRestSeconds: number;
  defaultWarmUpSets: number;
  defaultWorkingSets: number;
  defaultWarmUpPercent: number;
};

function formatRestTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ProgramDefaults({ program }: { program: Program }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [restSeconds, setRestSeconds] = useState(program.defaultRestSeconds);
  const [warmUpSets, setWarmUpSets] = useState(program.defaultWarmUpSets);
  const [workingSets, setWorkingSets] = useState(program.defaultWorkingSets);
  const [warmUpPercent, setWarmUpPercent] = useState(
    Math.round(program.defaultWarmUpPercent * 100)
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (values: {
      restSeconds: number;
      warmUpSets: number;
      workingSets: number;
      warmUpPercent: number;
    }) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        await updateProgramDefaults(program.id, {
          defaultRestSeconds: values.restSeconds,
          defaultWarmUpSets: values.warmUpSets,
          defaultWorkingSets: values.workingSets,
          defaultWarmUpPercent: values.warmUpPercent,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }, 600);
    },
    [program.id]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function update(
    field: "restSeconds" | "warmUpSets" | "workingSets" | "warmUpPercent",
    value: number
  ) {
    const next = { restSeconds, warmUpSets, workingSets, warmUpPercent };
    next[field] = value;

    if (field === "restSeconds") setRestSeconds(value);
    if (field === "warmUpSets") setWarmUpSets(value);
    if (field === "workingSets") setWorkingSets(value);
    if (field === "warmUpPercent") setWarmUpPercent(value);

    save(next);
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="size-4 text-muted-foreground" />
                <CardTitle>Program Defaults</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                {!open && (
                  <CardDescription className="hidden sm:block">
                    Rest: {formatRestTime(program.defaultRestSeconds)} | Sets:{" "}
                    {program.defaultWarmUpSets}W + {program.defaultWorkingSets}
                    S | Warm-up: {Math.round(program.defaultWarmUpPercent * 100)}
                    %
                  </CardDescription>
                )}
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    open && "rotate-180"
                  )}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="restSeconds">Rest Between Sets</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="restSeconds"
                    type="number"
                    min={0}
                    max={600}
                    step={5}
                    value={restSeconds}
                    onChange={(e) =>
                      update(
                        "restSeconds",
                        parseInt(e.target.value, 10) || 0
                      )
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    seconds ({formatRestTime(restSeconds)})
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="warmUpSets">Warm-up Sets</Label>
                <Input
                  id="warmUpSets"
                  type="number"
                  min={0}
                  max={10}
                  value={warmUpSets}
                  onChange={(e) =>
                    update("warmUpSets", parseInt(e.target.value, 10) || 0)
                  }
                  className="w-24"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workingSets">Working Sets</Label>
                <Input
                  id="workingSets"
                  type="number"
                  min={1}
                  max={20}
                  value={workingSets}
                  onChange={(e) =>
                    update("workingSets", parseInt(e.target.value, 10) || 1)
                  }
                  className="w-24"
                />
              </div>

              <div className="space-y-3">
                <Label>
                  Warm-up Weight Percentage:{" "}
                  <span className="font-normal text-muted-foreground">
                    {warmUpPercent}%
                  </span>
                </Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={warmUpPercent}
                  onChange={(e) =>
                    update("warmUpPercent", parseInt(e.target.value, 10))
                  }
                  className="w-full accent-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Percentage of working weight used for warm-up sets
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <span
                className={cn(
                  "flex items-center gap-1 text-xs text-muted-foreground transition-opacity",
                  saved ? "opacity-100" : "opacity-0"
                )}
              >
                <Check className="size-3" />
                Saved
              </span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
