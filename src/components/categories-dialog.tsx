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
import { succeeded } from "@/lib/toast-result";

type Result = Promise<{ error?: string }>;

// Add / rename / delete a building's categories (expenses, electricity bills). The actions are
// the page's server actions; a category still in use is refused by deleteAction.
export function CategoriesDialog({
  title,
  categories,
  createAction,
  renameAction,
  deleteAction,
}: {
  title: string;
  categories: { id: string; name: string; useCount: number }[];
  createAction: (formData: FormData) => Result;
  renameAction: (formData: FormData) => Result;
  deleteAction: (id: string) => Result;
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {/* Keyed by name too, so a rename rebuilds the row with the new name. */}
          {categories.map((c) => (
            <li key={`${c.id}-${c.name}`} className="flex items-start gap-2">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await succeeded(renameAction(new FormData(e.currentTarget)));
                }}
                className="flex flex-1 gap-2"
              >
                <input type="hidden" name="id" value={c.id} />
                <Input name="name" defaultValue={c.name} aria-label={`Rename ${c.name}`} required />
                <span className="w-16 shrink-0 self-center text-xs text-muted-foreground">
                  {c.useCount} used
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
                  if (confirm(`Delete the category "${c.name}"?`)) await succeeded(deleteAction(c.id));
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
            if (await succeeded(createAction(new FormData(form)))) form.reset();
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
