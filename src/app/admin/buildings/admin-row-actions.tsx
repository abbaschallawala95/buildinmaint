"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBuildingAdmin, resetBuildingAdminPassword, removeBuildingAdmin } from "./actions";

type Admin = { id: string; name: string; email: string; phone: string | null };

export function AdminRowActions({ admin, buildingName }: { admin: Admin; buildingName: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | undefined>();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetError, setResetError] = useState<string | undefined>();
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="gap-1">
              {admin.name}
              <ChevronDown className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">{admin.email}</div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setResetOpen(true)}>Reset Password</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setRemoveOpen(true)}>
            Remove Admin
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={editOpen}
        onOpenChange={(next) => {
          setEditOpen(next);
          if (next) setEditError(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin — {buildingName}</DialogTitle>
          </DialogHeader>
          <form
            action={async (formData) => {
              const result = await updateBuildingAdmin({ error: undefined }, formData);
              if (result.error) setEditError(result.error);
              else setEditOpen(false);
            }}
            className="space-y-4"
          >
            <input type="hidden" name="id" value={admin.id} />
            <div className="space-y-2">
              <Label htmlFor={`admin-name-${admin.id}`}>Name</Label>
              <Input id={`admin-name-${admin.id}`} name="name" defaultValue={admin.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`admin-email-${admin.id}`}>Email</Label>
              <Input id={`admin-email-${admin.id}`} name="email" type="email" defaultValue={admin.email} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`admin-phone-${admin.id}`}>Phone</Label>
              <Input id={`admin-phone-${admin.id}`} name="phone" defaultValue={admin.phone ?? ""} />
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            <Button type="submit" className="w-full">
              Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetOpen}
        onOpenChange={(next) => {
          setResetOpen(next);
          if (next) setResetError(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <form
            action={async (formData) => {
              const result = await resetBuildingAdminPassword({ error: undefined }, formData);
              if (result.error) setResetError(result.error);
              else setResetOpen(false);
            }}
            className="space-y-4"
          >
            <input type="hidden" name="id" value={admin.id} />
            <div className="space-y-2">
              <Label htmlFor={`admin-password-${admin.id}`}>New Password</Label>
              <Input id={`admin-password-${admin.id}`} name="password" type="text" minLength={6} required />
            </div>
            {resetError && <p className="text-sm text-destructive">{resetError}</p>}
            <Button type="submit" className="w-full">
              Set Password
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {admin.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This removes {admin.name}&apos;s admin login for {buildingName}. This cannot be undone.
          </p>
          <Button
            variant="destructive"
            className="w-full"
            disabled={removing}
            onClick={async () => {
              setRemoving(true);
              await removeBuildingAdmin(admin.id);
              setRemoving(false);
              setRemoveOpen(false);
            }}
          >
            {removing ? "Removing…" : "Remove Admin"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
