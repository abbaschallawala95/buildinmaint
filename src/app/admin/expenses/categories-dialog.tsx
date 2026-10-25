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
import { createCategory, deleteCategory, renameCategory } from "./actions";
import { succeeded } from "@/lib/toast-result";

export function CategoriesDialog({
  categories,
}: {
  categories: { id: string; name: string; expenseCount: number }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Categories
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Expense Categories</DialogTitle>
        </DialogHeader>

        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {categories.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await succeeded(renameCategory(new FormData(e.currentTarget)));
                }}
                className="flex flex-1 gap-2"
              >
                <input type="hidden" name="id" value={c.id} />
                <Input name="name" defaultValue={c.name} aria-label={`Rename ${c.name}`} required />
                <span className="w-16 shrink-0 self-center text-xs text-muted-foreground">
                  {c.expenseCount} used
                </span>
                <Button type="submit" variant="outline" size="sm">
                  Rename
                </Button>
              </form>
              {/* Errors go to a toast: an inline message would squeeze this row's input. */}
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (confirm(`Delete the category "${c.name}"?`)) await succeeded(deleteCategory(c.id));
                }}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            if (await succeeded(createCategory(new FormData(form)))) form.reset();
          }}
          className="space-y-2 border-t pt-4"
        >
          <Label htmlFor="new-category">Add a Category</Label>
          <div className="flex gap-2">
            <Input id="new-category" name="name" required />
            <Button type="submit">Add</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
