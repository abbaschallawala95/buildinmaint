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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createFlat, updateFlat } from "./actions";
import { succeeded } from "@/lib/toast-result";
import { currentMonthValue } from "@/lib/utils";

type MemberOption = { id: string; name: string; email: string };

export function FlatDialog({
  floorId,
  flat,
  members,
  trigger,
}: {
  floorId: string;
  flat?: {
    id: string;
    flatNumber: string;
    monthlyMaintenanceAmount: string | number;
    memberId: string | null;
  };
  members: MemberOption[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState(flat?.memberId ?? "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{flat ? "Edit Flat" : "Add Flat"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            if (await succeeded(flat ? updateFlat(formData) : createFlat(formData))) setOpen(false);
          }}
          className="space-y-4"
        >
          {flat && <input type="hidden" name="id" value={flat.id} />}
          <input type="hidden" name="floorId" value={floorId} />
          <input type="hidden" name="memberId" value={memberId} />
          <div className="space-y-2">
            <Label htmlFor="flatNumber">Flat Number</Label>
            <Input
              id="flatNumber"
              name="flatNumber"
              defaultValue={flat?.flatNumber}
              placeholder="e.g. 101"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthlyMaintenanceAmount">Monthly Maintenance Amount</Label>
            <Input
              id="monthlyMaintenanceAmount"
              name="monthlyMaintenanceAmount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={flat?.monthlyMaintenanceAmount?.toString()}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="effectiveFrom">Amount Effective From</Label>
            <Input id="effectiveFrom" name="effectiveFrom" type="month" defaultValue={currentMonthValue()} required />
            <p className="text-xs text-muted-foreground">
              Pick an earlier month to correct a past rate. Months before this keep their old amount.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Assigned Member</Label>
            <Select
              items={{ none: "Unassigned", ...Object.fromEntries(members.map((m) => [m.id, `${m.name} (${m.email})`])) }}
              value={memberId || "none"}
              onValueChange={(v) => setMemberId(!v || v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
