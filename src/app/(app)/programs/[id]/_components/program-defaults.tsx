"use client";

import { useState } from "react";
import { Settings, ChevronDown, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  const [pending, setPending] = useState(false);
  const [restSeconds, setRestSeconds] = useState(program.defaultRestSeconds);
  const [warmUpPercent, setWarmUpPercent] = useState(
    Math.round(program.defaultWarmUpPercent * 100)
  );

  async function handleSave(formData: FormData) {
    setPending(true);
    formData.set("defaultRestSeconds", restSeconds.toString());
    formData.set("defaultWarmUpPercent", warmUpPercent.toString());
    await updateProgramDefaults(program.id, formData);
    setPending(false);
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
            <form action={handleSave}>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="restSeconds">
                    Rest Between Sets
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="restSeconds"
                      type="number"
                      min={0}
                      max={600}
                      step={5}
                      value={restSeconds}
                      onChange={(e) =>
                        setRestSeconds(parseInt(e.target.value, 10) || 0)
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
                    name="defaultWarmUpSets"
                    type="number"
                    min={0}
                    max={10}
                    defaultValue={program.defaultWarmUpSets}
                    className="w-24"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workingSets">Working Sets</Label>
                  <Input
                    id="workingSets"
                    name="defaultWorkingSets"
                    type="number"
                    min={1}
                    max={20}
                    defaultValue={program.defaultWorkingSets}
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
                  <Slider
                    value={[warmUpPercent]}
                    onValueChange={(val) => {
                      const arr = Array.isArray(val) ? val : [val];
                      setWarmUpPercent(arr[0]);
                    }}
                    min={0}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentage of working weight used for warm-up sets
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button type="submit" size="sm" disabled={pending}>
                  <Save className="size-3.5" />
                  {pending ? "Saving..." : "Save Defaults"}
                </Button>
              </div>
            </form>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
