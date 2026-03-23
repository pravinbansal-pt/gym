"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DistanceUnitFormProps {
  defaultDistanceUnit: string;
  updateDistanceUnit: (formData: FormData) => Promise<void>;
}

export function DistanceUnitForm({
  defaultDistanceUnit,
  updateDistanceUnit,
}: DistanceUnitFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateDistanceUnit(formData);
        toast.success("Settings saved");
      } catch {
        toast.error("Failed to save settings");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="grid gap-2">
        <Select name="distanceUnit" defaultValue={defaultDistanceUnit}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="KM">Kilometers (km)</SelectItem>
            <SelectItem value="MILES">Miles (mi)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending && (
          <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
        )}
        Save
      </Button>
    </form>
  );
}
