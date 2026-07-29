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
  member: { id: string; name: string; phone: string | null };
}) {
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
          <DialogTitle>Edit Member</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await updateMember(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={member.id} />
          <div className="space-y-2">
            <Label htmlFor={`name-${member.id}`}>Name</Label>
            <Input id={`name-${member.id}`} name="name" defaultValue={member.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`phone-${member.id}`}>Phone</Label>
            <Input id={`phone-${member.id}`} name="phone" defaultValue={member.phone ?? ""} />
          </div>
          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
