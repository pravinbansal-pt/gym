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

interface SettingsFormProps {
  defaultWeightUnit: string;
  updateWeightUnit: (formData: FormData) => Promise<void>;
}

export function SettingsForm({
  defaultWeightUnit,
  updateWeightUnit,
}: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateWeightUnit(formData);
        toast.success("Settings saved");
      } catch {
        toast.error("Failed to save settings");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="grid gap-2">
        <Select name="weightUnit" defaultValue={defaultWeightUnit}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="KG">Kilograms (kg)</SelectItem>
            <SelectItem value="LBS">Pounds (lbs)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
        Save
      </Button>
    </form>
  );
}
