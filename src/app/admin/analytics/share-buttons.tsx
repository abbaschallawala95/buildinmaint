"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { succeeded } from "@/lib/toast-result";
import { shareAnalytics, unshareAnalytics } from "./actions";

export function ShareButton({ period, cmp, sections, label }: { period: string; cmp: string; sections: string[]; label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("period", period);
          fd.set("cmp", cmp);
          sections.forEach((s) => fd.append("s", s));
          if (await succeeded(shareAnalytics(fd))) toast.success(`${label} shared with members`);
        })
      }
    >
      <Share2 className="size-4" aria-hidden /> {pending ? "Sharing…" : "Share with members"}
    </Button>
  );
}

export function UnshareButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("id", id);
          if (await succeeded(unshareAnalytics(fd))) toast.success(`${label} is no longer shared`);
        })
      }
    >
      <Trash2 className="size-4" aria-hidden /> Unshare
    </Button>
  );
}
