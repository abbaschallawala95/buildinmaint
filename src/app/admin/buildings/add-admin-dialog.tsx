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
import { createBuildingAdmin } from "./actions";

export function AddAdminDialog({ buildingId, buildingName }: { buildingId: string; buildingName: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(undefined);
      }}
    >
      <DialogTrigger render={<Button size="sm">Add Admin</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Admin — {buildingName}</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            setPending(true);
            const result = await createBuildingAdmin({ error: undefined }, formData);
            setPending(false);
            if (result.error) setError(result.error);
            else setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="buildingId" value={buildingId} />
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Temporary Password</Label>
            <Input id="password" name="password" type="text" minLength={6} required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating…" : "Create Admin"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
