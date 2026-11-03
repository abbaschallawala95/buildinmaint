"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { whatsappAppLink, whatsappLink, whatsappNumber } from "@/lib/receipt";

export type ReceiptContact = { phone: string | null; memberName: string | null; flatLabel: string };

function downloadImage(image: Blob) {
  const href = URL.createObjectURL(image);
  const link = document.createElement("a");
  link.href = href;
  link.download = "maintenance-receipt.png";
  link.click();
  URL.revokeObjectURL(href);
}

export function ReceiptButtons({ paymentId, contact }: { paymentId: string; contact: ReceiptContact }) {
  const [preparing, setPreparing] = useState(false);
  const url = `/receipt/${paymentId}`;

  // Only the paid API can put a file into a chat, so this hands the admin the image and opens the
  // chat: copied on a computer (Ctrl+V), saved on a phone, where pasting an image is awkward.
  const send = async () => {
    setPreparing(true);
    const onPhone = /Android|iPhone|iPad|iPod/.test(navigator.userAgent);
    const webLink = whatsappLink(contact.phone);
    const image = fetch(`/api/receipt-image?id=${paymentId}`).then((r) => {
      if (!r.ok) throw new Error("Receipt image not available");
      return r.blob();
    });
    try {
      let copied = false;
      if (!onPhone) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": image })]);
          copied = true;
        } catch {
          // Copying was refused: the download below still gives the admin the image.
        }
      }
      if (!copied) downloadImage(await image);

      if (onPhone) {
        window.open(webLink, "_blank", "noopener"); // phones go from wa.me straight into the app
      } else {
        // On a computer wa.me stops at a web page; this goes straight to the chat in the desktop app.
        const link = document.createElement("a");
        link.href = whatsappAppLink(contact.phone);
        link.click();
      }
      toast.success(
        copied ? "Receipt image copied. Press Ctrl+V in the chat, then Send." : "Receipt image saved. Attach it in the chat, then Send.",
        { duration: 10000, action: { label: "Didn't open?", onClick: () => window.open(webLink, "_blank", "noopener") } },
      );
    } catch {
      toast.error("Could not create the receipt image. Please try again.");
    } finally {
      setPreparing(false);
    }
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => window.open(`${url}?print=1`, "_blank", "noopener")}>
        Print Receipt
      </Button>
      {whatsappNumber(contact.phone) !== "" && (
        <Button type="button" size="sm" variant="outline" disabled={preparing} onClick={send}>
          {preparing ? "Preparing…" : "Send on WhatsApp"}
        </Button>
      )}
    </>
  );
}
