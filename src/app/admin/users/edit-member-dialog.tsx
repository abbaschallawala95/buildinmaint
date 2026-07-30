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
import { updateMember } from "./actions";

export function EditMemberDialog({
  member,
}: {
  member: { id: string; name: string; email: string; phone: string | null };
}) {
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
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Edit
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            setPending(true);
            const result = await updateMember({ error: undefined }, formData);
            setPending(false);
            if (result.error) setError(result.error);
            else setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={member.id} />
          <div className="space-y-2">
            <Label htmlFor={`name-${member.id}`}>Name</Label>
            <Input id={`name-${member.id}`} name="name" defaultValue={member.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`email-${member.id}`}>Email</Label>
            <Input id={`email-${member.id}`} name="email" type="email" defaultValue={member.email} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`phone-${member.id}`}>Phone</Label>
            <Input id={`phone-${member.id}`} name="phone" defaultValue={member.phone ?? ""} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
