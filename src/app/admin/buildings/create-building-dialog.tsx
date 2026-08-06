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
import { createBuilding } from "./actions";

export function CreateBuildingDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Add Building</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Building</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createBuilding(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Building Name</Label>
            <Input id="name" name="name" placeholder="e.g. Sunrise Apartments" required />
          </div>
          <Button type="submit" className="w-full">
            Create
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
