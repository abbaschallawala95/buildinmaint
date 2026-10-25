"use client";

import { useState, useTransition } from "react";
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
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { setMemberActive, resetMemberPassword, deleteMember } from "./actions";
import { succeeded } from "@/lib/toast-result";

export function MemberRowActions({ id, isActive }: { id: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetError, setResetError] = useState<string | undefined>();

  return (
    <div className="flex items-center gap-2">
      <Dialog
        open={resetOpen}
        onOpenChange={(next) => {
          setResetOpen(next);
          if (next) setResetError(undefined);
        }}
      >
        <DialogTrigger
          render={
            <Button variant="outline" size="sm">
              Reset Password
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <form
            action={async (formData) => {
              const result = await resetMemberPassword({ error: undefined }, formData);
              if (result.error) setResetError(result.error);
              else setResetOpen(false);
            }}
            className="space-y-4"
          >
            <input type="hidden" name="id" value={id} />
            <div className="space-y-2">
              <Label htmlFor={`password-${id}`}>New Password</Label>
              <Input id={`password-${id}`} name="password" type="text" minLength={8} required />
            </div>
            {resetError && <p className="text-sm text-destructive">{resetError}</p>}
            <Button type="submit" className="w-full">
              Set Password
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Button
        variant={isActive ? "destructive" : "default"}
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await succeeded(setMemberActive(id, !isActive));
          })
        }
      >
        {isActive ? "Deactivate" : "Activate"}
      </Button>

      <ConfirmDeleteButton
        id={id}
        action={deleteMember}
        confirmMessage="Delete this member? This permanently removes their login and unassigns their flat."
      />
    </div>
  );
}
