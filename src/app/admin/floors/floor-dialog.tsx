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
import { createFloor, updateFloor } from "./actions";

export function FloorDialog({
  floor,
  trigger,
}: {
  floor?: { id: string; name: string; sortOrder: number };
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{floor ? "Edit Floor" : "Add Floor"}</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            if (floor) await updateFloor(formData);
            else await createFloor(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          {floor && <input type="hidden" name="id" value={floor.id} />}
          <div className="space-y-2">
            <Label htmlFor="name">Floor Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={floor?.name}
              placeholder="e.g. Ground Floor, G+1"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sortOrder">Display Order</Label>
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={floor?.sortOrder ?? 0}
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
