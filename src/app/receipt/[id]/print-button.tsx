"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function PrintButton({ auto }: { auto: boolean }) {
  useEffect(() => {
    if (auto) window.print();
  }, [auto]);

  return (
    <Button onClick={() => window.print()} className="print:hidden">
      Print Receipt
    </Button>
  );
}
