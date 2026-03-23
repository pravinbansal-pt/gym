"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { CalendarDays, CalendarPlus } from "lucide-react"
import { format } from "date-fns"
import { createSchedule } from "../_actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const PRESETS = [
  { label: "Every day", pattern: [1] },
  { label: "6 on / 1 off", pattern: [1, 1, 1, 1, 1, 1, 0] },
  { label: "5 on / 2 off", pattern: [1, 1, 1, 1, 1, 0, 0] },
  { label: "3 on / 1 off", pattern: [1, 1, 1, 0] },
  { label: "Every other day", pattern: [1, 0] },
] as const

type ProgramOption = {
  id: string
  name: string
  workouts: { id: string }[]
}

interface ScheduleSetupDialogProps {
  programs: ProgramOption[]
  hasActiveSchedule: boolean
}

export function ScheduleSetupDialog({ programs, hasActiveSchedule }: ScheduleSetupDialogProps) {
  const [open, setOpen] = useState(false)
  const [programId, setProgramId] = useState("")
  const [startDate, setStartDate] = useState<Date | undefined>(new Date())
  const [selectedPreset, setSelectedPreset] = useState(1) // default: 6 on / 1 off
  const [customOn, setCustomOn] = useState(5)
  const [customOff, setCustomOff] = useState(2)
  const [isPending, startTransition] = useTransition()
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const isCustom = selectedPreset === -1
  const pattern = isCustom
    ? [...Array(customOn).fill(1), ...Array(customOff).fill(0)]
    : [...PRESETS[selectedPreset].pattern]

  const trainDaysPerCycle = pattern.filter((d) => d === 1).length
  const cycleDays = pattern.length

  function handleSubmit() {
    if (!programId || !startDate) {
      toast.error("Please fill in all fields")
      return
    }

    startTransition(async () => {
      try {
        await createSchedule(programId, format(startDate, "yyyy-MM-dd"), pattern)
        toast.success("Schedule created")
        setOpen(false)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create schedule")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={hasActiveSchedule ? "outline" : "default"}>
            {hasActiveSchedule ? (
              <>
                <CalendarDays className="size-4" />
                New Schedule
              </>
            ) : (
              <>
                <CalendarPlus className="size-4" />
                Create Schedule
              </>
            )}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Workout Schedule</DialogTitle>
          <DialogDescription>
            Your workouts cycle through in order — no need to fit a weekly pattern.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Program select */}
          <div className="space-y-2">
            <Label>Program</Label>
            <Select value={programId} onValueChange={(v) => setProgramId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.workouts.length} workouts)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start date */}
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger
                render={
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarDays className="size-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                }
              />
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date)
                    setDatePickerOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Training pattern */}
          <div className="space-y-2">
            <Label>Training Pattern</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {PRESETS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedPreset(i)}
                  className={cn(
                    "rounded-md border px-2 py-2 text-xs font-medium transition-colors",
                    selectedPreset === i
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedPreset(-1)}
                className={cn(
                  "rounded-md border px-2 py-2 text-xs font-medium transition-colors",
                  isCustom
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                )}
              >
                Custom
              </button>
            </div>

            {isCustom && (
              <div className="flex items-center gap-2 pt-2">
                <Input
                  type="number"
                  min={1}
                  max={14}
                  value={customOn}
                  onChange={(e) => setCustomOn(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-center"
                />
                <span className="text-sm text-muted-foreground">days on,</span>
                <Input
                  type="number"
                  min={0}
                  max={7}
                  value={customOff}
                  onChange={(e) => setCustomOff(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 text-center"
                />
                <span className="text-sm text-muted-foreground">days off</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {trainDaysPerCycle === cycleDays
                ? "Train every day, no rest days"
                : `Train ${trainDaysPerCycle} day${trainDaysPerCycle !== 1 ? "s" : ""}, rest ${cycleDays - trainDaysPerCycle}, repeat`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Creating..." : "Create Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
