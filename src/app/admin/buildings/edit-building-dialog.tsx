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
import { updateBuilding } from "./actions";
import { succeeded } from "@/lib/toast-result";

export function EditBuildingDialog({ building }: { building: { id: string; name: string } }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Edit
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Building</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            if (await succeeded(updateBuilding(formData))) setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={building.id} />
          <div className="space-y-2">
            <Label htmlFor={`building-name-${building.id}`}>Building Name</Label>
            <Input id={`building-name-${building.id}`} name="name" defaultValue={building.name} required />
          </div>
          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
