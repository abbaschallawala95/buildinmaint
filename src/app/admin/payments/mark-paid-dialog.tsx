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
import { markPaymentPaid } from "./actions";
import { todayValue } from "@/lib/utils";
import { succeeded } from "@/lib/toast-result";
import { whatsappNumber } from "@/lib/receipt";
import { ReceiptButtons, type ReceiptContact } from "./receipt-buttons";

export function MarkPaidDialog({
  flatId,
  month,
  year,
  defaultAmount,
  alreadyPaid = 0,
  hideTrigger = false,
  contact,
}: {
  flatId: string;
  month: number;
  year: number;
  defaultAmount: string;
  /** set when the month is Partial: the amount entered is added on top of this */
  alreadyPaid?: number;
  /** fully paid month: the button is gone but the dialog stays mounted to show the saved step */
  hideTrigger?: boolean;
  contact: ReceiptContact;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const adding = alreadyPaid > 0;
  const [method, setMethod] = useState("CASH");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSavedId(null);
      }}
    >
      {!hideTrigger && <DialogTrigger render={<Button size="sm">{adding ? "Add Payment" : "Mark Paid"}</Button>} />}
      <DialogContent>
        {savedId ? (
          <>
            <DialogHeader>
              <DialogTitle>Payment Saved</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Share the receipt with {contact.memberName ?? "the member"} for {contact.flatLabel}.
            </p>
            <div className="flex flex-wrap gap-2">
              <ReceiptButtons paymentId={savedId} contact={contact} />
            </div>
            {!whatsappNumber(contact.phone) && (
              <p className="text-sm text-muted-foreground">
                No valid phone number is saved for this member. Add it under Members to send the receipt on WhatsApp.
              </p>
            )}
          </>
        ) : (
        <>
        <DialogHeader>
          <DialogTitle>{adding ? "Add Remaining Payment" : "Record Payment"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            setSaving(true);
            const result = await markPaymentPaid(formData);
            setSaving(false);
            if (await succeeded(Promise.resolve(result))) setSavedId(result.paymentId ?? null);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="flatId" value={flatId} />
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="paymentMethod" value={method} />
          {adding && <input type="hidden" name="addToExisting" value="1" />}
          {adding && (
            <p className="text-sm text-muted-foreground">
              ₹{alreadyPaid.toFixed(2)} already paid for this month. The amount below is added to it.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultAmount}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input
              id="paymentDate"
              name="paymentDate"
              type="date"
              defaultValue={todayValue()}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select
              items={{ CASH: "Cash", UPI: "UPI", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque", OTHER: "Other" }}
              value={method}
              onValueChange={(v) => v && setMethod(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" placeholder="Optional" />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving…" : "Save Payment"}
          </Button>
        </form>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
