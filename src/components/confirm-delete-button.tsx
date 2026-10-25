"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmDeleteButton({
  action,
  id,
  confirmMessage,
  label = "Delete",
}: {
  action: (id: string) => Promise<{ error?: string } | void>;
  id: string;
  confirmMessage: string;
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (!confirm(confirmMessage)) return;
          setError(undefined);
          startTransition(async () => {
            try {
              const result = await action(id);
              if (result?.error) setError(result.error);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to delete");
            }
          });
        }}
      >
        {label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
