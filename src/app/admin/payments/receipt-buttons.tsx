"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/receipt";

export type ReceiptContact = { phone: string | null; memberName: string | null; flatLabel: string };

export function ReceiptButtons({ paymentId, contact }: { paymentId: string; contact: ReceiptContact }) {
  const [sending, setSending] = useState(false);
  const url = `/receipt/${paymentId}`;
  const imageUrl = `/api/receipt-image?id=${paymentId}`;

  // Only the paid API can put a file into a chosen chat. The device's share menu is the free way
  // to carry the image: the admin picks WhatsApp and the member, then sends.
  const send = async () => {
    setSending(true);
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        toast.error("Could not load the receipt image. Please try again.");
        return;
      }
      const file = new File([await response.blob()], "maintenance-receipt.png", { type: "image/png" });
      if (!navigator.canShare?.({ files: [file] })) throw new Error("Sharing files is not supported");
      await navigator.share({ files: [file] });
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // closed the share menu
      // No share menu here, or it was refused: a file to attach by hand in the member's chat.
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = "maintenance-receipt.png";
      link.click();
      window.open(whatsappLink(contact.phone), "_blank", "noopener");
      toast.info("This browser can't share images, so the receipt was downloaded. Attach it in the chat and press Send.", { duration: 8000 });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => window.open(`${url}?print=1`, "_blank", "noopener")}>
        Print Receipt
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={sending}
        onClick={send}
      >
        {sending ? "Preparing…" : "Send on WhatsApp"}
      </Button>
    </>
  );
}
