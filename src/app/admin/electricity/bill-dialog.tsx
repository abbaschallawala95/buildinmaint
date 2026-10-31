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
  categories,
  bill,
  trigger,
}: {
  categories: { id: string; name: string }[];
  bill?: {
    id: string;
    categoryId: string;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    amount: string | number;
    dueDate: string;
  };
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(bill?.categoryId ?? categories[0]?.id ?? "");

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
          <input type="hidden" name="categoryId" value={categoryId} />
          <div className="space-y-2">
            <Label>Category</Label>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add a category first with the Categories button.</p>
            ) : (
              <Select
                items={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
                value={categoryId}
                onValueChange={(v) => v && setCategoryId(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
          <Button type="submit" className="w-full" disabled={!categoryId}>
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
