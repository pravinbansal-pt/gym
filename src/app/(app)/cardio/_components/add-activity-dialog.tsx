"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { createCardioActivity } from "../_actions";
import { toast } from "sonner";

export function AddActivityDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createCardioActivity(formData);
        toast.success("Activity logged");
        setOpen(false);
      } catch {
        toast.error("Failed to log activity");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" size="sm">
          <Plus className="size-3.5" />
          Log Run
        </Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
          <DialogDescription>
            Manually log a run or other cardio activity.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activity-name">Name</Label>
            <Input
              id="activity-name"
              name="name"
              placeholder="e.g., Morning Run"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Activity Type</Label>
            <Select name="activityType" defaultValue="Run">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Run">Run</SelectItem>
                <SelectItem value="Walk">Walk</SelectItem>
                <SelectItem value="Hike">Hike</SelectItem>
                <SelectItem value="Ride">Ride</SelectItem>
                <SelectItem value="TrailRun">Trail Run</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="distance">Distance (km)</Label>
              <Input
                id="distance"
                name="distanceKm"
                type="number"
                step="0.01"
                min="0"
                placeholder="5.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                name="durationMinutes"
                type="number"
                step="0.1"
                min="0"
                placeholder="30.0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="elevation">Elevation Gain (m)</Label>
              <Input
                id="elevation"
                name="elevationGain"
                type="number"
                step="1"
                min="0"
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heartrate">Avg Heart Rate</Label>
              <Input
                id="heartrate"
                name="averageHeartrate"
                type="number"
                step="1"
                min="0"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="activityDate"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Log Activity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
