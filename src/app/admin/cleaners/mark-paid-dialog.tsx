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
import { markCleanerPaid } from "./actions";

export function MarkCleanerPaidDialog({
  cleanerId,
  month,
  year,
  defaultAmount,
}: {
  cleanerId: string;
  month: number;
  year: number;
  defaultAmount: string;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("CASH");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Mark Paid</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Salary Payment</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await markCleanerPaid(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="cleanerId" value={cleanerId} />
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="paymentMethod" value={method} />
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
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full">
            Save Payment
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
