"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { resetAllData } from "./actions";

export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <Card className="max-w-xl border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>
          Erase all floors, flats, members, cleaners, payments, charges, expenses, bills, and audit
          logs — a full reset back to a blank building. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) {
              setConfirm("");
              setError(undefined);
              setDone(false);
            }
          }}
        >
          <DialogTrigger render={<Button variant="destructive">Erase All Data & Start Fresh</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Erase all data?</DialogTitle>
            </DialogHeader>
            {done ? (
              <p className="text-sm">All data erased. Reload the page to see the fresh building.</p>
            ) : (
              <form
                action={async (formData) => {
                  setPending(true);
                  const result = await resetAllData({ error: undefined }, formData);
                  setPending(false);
                  if (result.error) setError(result.error);
                  else setDone(true);
                }}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  This permanently deletes every floor, flat, member, cleaner, payment, charge,
                  expense, electricity bill, and audit log. Your own super-admin login and building
                  settings are kept. Type <span className="font-mono font-semibold">DELETE</span> to
                  confirm.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmation</Label>
                  <Input
                    id="confirm"
                    name="confirm"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="off"
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full"
                  disabled={pending || confirm !== "DELETE"}
                >
                  {pending ? "Erasing…" : "Erase Everything"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
