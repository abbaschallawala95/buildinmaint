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
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { addCleanerPaymentEntry, deleteCleanerPaymentEntry } from "./actions";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

export type CleanerPaymentEntryRow = {
  id: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  notes: string | null;
};

export function CleanerPaymentsDialog({
  cleanerName,
  cleanerId,
  month,
  year,
  due,
  paid,
  entries,
  trigger,
}: {
  cleanerName: string;
  cleanerId: string;
  month: number;
  year: number;
  due: number;
  paid: number;
  entries: CleanerPaymentEntryRow[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("CASH");
  const remaining = Math.max(due - paid, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cleanerName} — Payments</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 rounded-lg border p-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Due</div>
            <div className="font-medium">₹{due.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Paid</div>
            <div className="font-medium">₹{paid.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className="font-medium">₹{remaining.toFixed(2)}</div>
          </div>
        </div>

        {entries.length > 0 && (
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div>
                  <div className="font-medium">₹{Number(e.amount).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(e.paymentDate).toLocaleDateString()} · {METHOD_LABELS[e.paymentMethod]}
                    {e.notes ? ` · ${e.notes}` : ""}
                  </div>
                </div>
                <ConfirmDeleteButton
                  id={e.id}
                  action={deleteCleanerPaymentEntry}
                  confirmMessage="Remove this payment entry?"
                  label="Remove"
                />
              </div>
            ))}
          </div>
        )}

        <form
          action={async (formData) => {
            await addCleanerPaymentEntry(formData);
          }}
          className="space-y-4 border-t pt-4"
        >
          <input type="hidden" name="cleanerId" value={cleanerId} />
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="paymentMethod" value={method} />
          <div className="space-y-2">
            <Label htmlFor="amount">Add Payment</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder={remaining > 0 ? remaining.toFixed(2) : undefined}
              defaultValue={remaining > 0 ? remaining.toFixed(2) : ""}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter a partial amount for an installment, or an amount for a future month as an
              advance.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input
              id="paymentDate"
              name="paymentDate"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={(v) => v && setMethod(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" name="notes" placeholder="e.g. advance for next month" />
          </div>
          <Button type="submit" className="w-full">
            Add Payment
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
