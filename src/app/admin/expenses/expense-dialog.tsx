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
import { createExpense, updateExpense } from "./actions";
import { todayValue } from "@/lib/utils";
import { succeeded } from "@/lib/toast-result";

type Category = { id: string; name: string };

export function ExpenseDialog({
  categories,
  expense,
  trigger,
}: {
  categories: Category[];
  expense?: {
    id: string;
    categoryId: string;
    description: string;
    amount: string | number;
    date: string;
  };
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? categories[0]?.id ?? "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expense ? "Edit Expense" : "Add Expense"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            if (await succeeded(expense ? updateExpense(formData) : createExpense(formData))) setOpen(false);
          }}
          className="space-y-4"
        >
          {expense && <input type="hidden" name="id" value={expense.id} />}
          <input type="hidden" name="categoryId" value={categoryId} />
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              items={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
              value={categoryId}
              onValueChange={(v) => v && setCategoryId(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              defaultValue={expense?.description}
              placeholder="e.g. Pipe leakage repair, 2nd floor"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={expense?.amount?.toString()}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={expense?.date ?? todayValue()}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={!categoryId}>
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
