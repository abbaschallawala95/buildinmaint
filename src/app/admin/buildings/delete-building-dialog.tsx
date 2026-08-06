"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteBuilding } from "./actions";

export function DeleteBuildingDialog({ building }: { building: { id: string; name: string } }) {
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setConfirmName("");
          setError(undefined);
        }
      }}
    >
      <DialogTrigger render={<Button variant="destructive" size="sm">Delete</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {building.name}?</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            setPending(true);
            const result = await deleteBuilding({ error: undefined }, formData);
            setPending(false);
            if (result.error) setError(result.error);
            else setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={building.id} />
          <p className="text-sm text-muted-foreground">
            This permanently deletes every floor, flat, member, admin login, cleaner, payment,
            expense, and electricity bill for this building. This cannot be undone. Type{" "}
            <span className="font-mono font-semibold">{building.name}</span> to confirm.
          </p>
          <div className="space-y-2">
            <Label htmlFor={`confirm-${building.id}`}>Confirmation</Label>
            <Input
              id={`confirm-${building.id}`}
              name="confirmName"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              autoComplete="off"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            variant="destructive"
            className="w-full"
            disabled={pending || confirmName !== building.name}
          >
            {pending ? "Deleting…" : "Delete Building"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
