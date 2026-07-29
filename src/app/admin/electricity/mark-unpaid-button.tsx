"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markBillUnpaid } from "./actions";

export function MarkUnpaidButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => markBillUnpaid(id))}
    >
      Mark Unpaid
    </Button>
  );
}
