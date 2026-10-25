"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createBulkCharge } from "./actions";

// Disables submit while saving so a double-click can't create every charge twice.
export function ChargeForm({ children, disabled }: { children: React.ReactNode; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(createBulkCharge, {});

  return (
    <form action={formAction} className="space-y-6">
      {children}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.ok && !pending && <p className="text-sm text-emerald-600">{state.ok}</p>}
      <Button type="submit" disabled={disabled || pending}>
        {pending ? "Creating…" : "Create Charges"}
      </Button>
    </form>
  );
}
