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
import { addPreviousYearDues } from "../actions";
import { succeeded } from "@/lib/toast-result";

export function PreviousDuesDialog({ flatId }: { flatId: string }) {
  const [open, setOpen] = useState(false);
  const now = new Date();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline">Add Previous Year Dues</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Previous Year Dues</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            if (await succeeded(addPreviousYearDues(formData))) setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="flatId" value={flatId} />
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input id="year" name="year" type="number" defaultValue={now.getFullYear() - 1} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount Due</Label>
            <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
          </div>
          <Button type="submit" className="w-full">
            Add
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
