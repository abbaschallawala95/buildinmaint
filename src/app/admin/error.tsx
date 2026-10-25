"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Safety net for unexpected errors; the admin sidebar (layout) stays usable around it.
export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4 rounded-lg border p-6">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        This page hit an unexpected error. Your data has not been changed by this message. Try
        again, or go back and retry the last action.
      </p>
      <Button onClick={() => retry()}>Try again</Button>
    </div>
  );
}
