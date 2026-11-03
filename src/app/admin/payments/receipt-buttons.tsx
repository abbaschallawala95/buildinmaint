"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { whatsappAppLink, whatsappLink, whatsappNumber } from "@/lib/receipt";

export type ReceiptContact = { phone: string | null; memberName: string | null; flatLabel: string; period: string };

export function ReceiptButtons({ paymentId, contact }: { paymentId: string; contact: ReceiptContact }) {
  const url = `/receipt/${paymentId}`;

  // Opens this member's chat with the message ready. The link shows the receipt image as a preview
  // (the receipt page's og:image); neither WhatsApp link can attach the file itself.
  const openChat = () => {
    const text = `Your maintenance receipt for ${contact.period} (${contact.flatLabel}):\n${window.location.origin}${url}`;
    const webLink = whatsappLink(contact.phone, text);
    if (/Android|iPhone|iPad|iPod/.test(navigator.userAgent)) {
      window.open(webLink, "_blank", "noopener"); // phones go from wa.me straight into the app
      return;
    }
    const link = document.createElement("a");
    link.href = whatsappAppLink(contact.phone, text);
    link.click();
    toast.info("Opening WhatsApp. Tap Send in the chat.", {
      duration: 8000,
      action: { label: "Didn't open?", onClick: () => window.open(webLink, "_blank", "noopener") },
    });
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => window.open(`${url}?print=1`, "_blank", "noopener")}>
        Print Receipt
      </Button>
      {whatsappNumber(contact.phone) !== "" && (
        <Button type="button" size="sm" variant="outline" onClick={openChat}>
          Send on WhatsApp
        </Button>
      )}
    </>
  );
}
