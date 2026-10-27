"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { succeeded } from "@/lib/toast-result";
import { savePreviousDue } from "./actions";

export type PreviousDue = {
  id: string;
  flatId: string;
  type: "MAINTENANCE" | "OTHER";
  description: string;
  amount: string;
  dueDate: string; // yyyy-mm-dd or ""
  paid: boolean;
  paymentDate: string; // yyyy-mm-dd or ""
};

const selectClass = "h-9 w-full rounded-md border bg-background px-3 text-sm";

// Add (no `due`) or edit a previous due. `flats` lists the building's flats; pass one to lock it.
export function PreviousDueDialog({
  flats,
  due,
  trigger,
}: {
  flats: { id: string; label: string }[];
  due?: PreviousDue;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastYear = new Date().getFullYear() - 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{due ? "Edit previous due" : "Add previous due"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            setSaving(true); // saving takes a few seconds; stops a double click adding it twice
            const ok = await succeeded(savePreviousDue(formData));
            setSaving(false);
            if (ok) {
              toast.success(due ? "Previous due updated" : "Previous due added");
              setOpen(false);
            }
          }}
          className="space-y-4"
        >
          {due && <input type="hidden" name="id" value={due.id} />}
          <div className="space-y-2">
            <Label htmlFor="pd-flat">Flat</Label>
            {flats.length === 1 ? (
              <>
                <input type="hidden" name="flatId" value={flats[0].id} />
                <p id="pd-flat" className="text-sm font-medium">{flats[0].label}</p>
              </>
            ) : (
              <select id="pd-flat" name="flatId" defaultValue={due?.flatId ?? ""} required className={selectClass}>
                <option value="" disabled>
                  Choose a flat
                </option>
                {flats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pd-type">Type</Label>
            <select id="pd-type" name="type" defaultValue={due?.type ?? "MAINTENANCE"} className={selectClass}>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pd-description">Note</Label>
            <Input
              id="pd-description"
              name="description"
              defaultValue={due?.description ?? `Maintenance dues ${lastYear}`}
              placeholder={`e.g. Maintenance dues ${lastYear}`}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pd-amount">Amount (₹)</Label>
              <Input id="pd-amount" name="amount" type="number" step="0.01" min="0.01" defaultValue={due?.amount} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-due">Due date (optional)</Label>
              <Input id="pd-due" name="dueDate" type="date" defaultValue={due?.dueDate} />
            </div>
          </div>
          {due?.paid && (
            <div className="space-y-2">
              <Label htmlFor="pd-paid">Payment date</Label>
              <Input id="pd-paid" name="paymentDate" type="date" defaultValue={due.paymentDate} required />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving…" : due ? "Save changes" : "Add"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
