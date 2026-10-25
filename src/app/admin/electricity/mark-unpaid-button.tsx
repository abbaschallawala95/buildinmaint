"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markBillUnpaid } from "./actions";
import { succeeded } from "@/lib/toast-result";

export function MarkUnpaidButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Mark this bill as unpaid? Its payment date will be cleared.")) return;
        startTransition(async () => {
          await succeeded(markBillUnpaid(id));
        });
      }}
    >
      Mark Unpaid
    </Button>
  );
}
