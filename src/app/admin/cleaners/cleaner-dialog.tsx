"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCleaner, updateCleaner } from "./actions";
import { succeeded } from "@/lib/toast-result";
import { currentMonthValue } from "@/lib/utils";

export function CleanerDialog({
  cleaner,
  trigger,
}: {
  cleaner?: { id: string; name: string; monthlySalary: string };
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cleaner ? "Edit Cleaner" : "Add Cleaner"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            if (await succeeded(cleaner ? updateCleaner(formData) : createCleaner(formData))) setOpen(false);
          }}
          className="space-y-4"
        >
          {cleaner && <input type="hidden" name="id" value={cleaner.id} />}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={cleaner?.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthlySalary">Monthly Salary</Label>
            <Input
              id="monthlySalary"
              name="monthlySalary"
              type="number"
              step="0.01"
              min="0"
              defaultValue={cleaner?.monthlySalary}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="effectiveFrom">Salary Effective From</Label>
            <Input id="effectiveFrom" name="effectiveFrom" type="month" defaultValue={currentMonthValue()} required />
            <p className="text-xs text-muted-foreground">
              Pick an earlier month to correct a past salary. Months before this keep their old amount.
            </p>
          </div>
          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
