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
import { createBill, updateBill } from "./actions";
import { succeeded } from "@/lib/toast-result";

export function BillDialog({
  bill,
  trigger,
}: {
  bill?: {
    id: string;
    type: "LIFT" | "COMMON_AREA";
    billingPeriodStart: string;
    billingPeriodEnd: string;
    amount: string | number;
    dueDate: string;
  };
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"LIFT" | "COMMON_AREA">(bill?.type ?? "LIFT");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bill ? "Edit Electricity Bill" : "Add Electricity Bill"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            if (await succeeded(bill ? updateBill(formData) : createBill(formData))) setOpen(false);
          }}
          className="space-y-4"
        >
          {bill && <input type="hidden" name="id" value={bill.id} />}
          <input type="hidden" name="type" value={type} />
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              items={{ LIFT: "Lift", COMMON_AREA: "Common Area" }}
              value={type}
              onValueChange={(v) => v && setType(v as "LIFT" | "COMMON_AREA")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LIFT">Lift</SelectItem>
                <SelectItem value="COMMON_AREA">Common Area</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="billingPeriodStart">Billing Period Start</Label>
              <Input
                id="billingPeriodStart"
                name="billingPeriodStart"
                type="date"
                defaultValue={bill?.billingPeriodStart}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingPeriodEnd">Billing Period End</Label>
              <Input
                id="billingPeriodEnd"
                name="billingPeriodEnd"
                type="date"
                defaultValue={bill?.billingPeriodEnd}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={bill?.amount?.toString()}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input id="dueDate" name="dueDate" type="date" defaultValue={bill?.dueDate} required />
          </div>
          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
