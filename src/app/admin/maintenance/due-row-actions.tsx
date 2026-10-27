"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayValue } from "@/lib/utils";
import { succeeded } from "@/lib/toast-result";
import { deletePreviousDue, markPreviousDuePaid, markPreviousDueUnpaid } from "./actions";
import { PreviousDueDialog, type PreviousDue } from "./previous-due-dialog";

function MarkPaidDialog({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Mark paid</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            const ok = await succeeded(markPreviousDuePaid(new FormData(e.currentTarget)));
            setSaving(false);
            if (ok) {
              toast.success("Marked as paid");
              setOpen(false);
            }
          }}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={id} />
          <div className="space-y-2">
            <Label htmlFor={`paid-${id}`}>Payment date</Label>
            <Input id={`paid-${id}`} name="paymentDate" type="date" defaultValue={todayValue()} required />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DueRowActions({ due, flats, label }: { due: PreviousDue; flats: { id: string; label: string }[]; label: string }) {
  const [pending, start] = useTransition();
  const run = (fn: (id: string) => Promise<{ error?: string }>, done: string, question: string) => {
    if (!confirm(question)) return;
    start(async () => {
      if (await succeeded(fn(due.id))) toast.success(done);
    });
  };

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {due.paid ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(markPreviousDueUnpaid, "Marked as unpaid", `Mark “${label}” as unpaid? Its payment date is cleared.`)}>
          Mark unpaid
        </Button>
      ) : (
        <MarkPaidDialog id={due.id} />
      )}
      <PreviousDueDialog flats={flats} due={due} trigger={<Button size="sm" variant="outline">Edit</Button>} />
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(deletePreviousDue, "Previous due deleted", `Delete “${label}”? This can't be undone.`)}>
        Delete
      </Button>
    </div>
  );
}
