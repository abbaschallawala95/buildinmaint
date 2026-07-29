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
import { markBillPaid } from "./actions";

export function MarkBillPaidDialog({ id }: { id: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Mark Paid</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Bill Payment</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await markBillPaid(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={id} />
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
          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
