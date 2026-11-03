// Payment dates are stored as midnight UTC, so UTC gives the same day on any server.
export function receiptDate(date: Date | null): string | null {
  return date ? date.toLocaleDateString("en-IN", { timeZone: "UTC" }) : null;
}

export function receiptNumber(n: number): string {
  return String(n).padStart(4, "0");
}

// A 10-digit number is taken as Indian. Empty means there is no usable number.
export function whatsappNumber(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "").replace(/^0+/, "");
  return digits.length === 10 ? `91${digits}` : digits.length > 10 ? digits : "";
}

// wa.me link that opens the member's chat. It can't carry a file.
export function whatsappLink(phone: string | null | undefined): string {
  return `https://wa.me/${whatsappNumber(phone)}`;
}

// WhatsApp's own link, for computers: wa.me stops at a "Continue to chat" web page there, while
// this goes straight to the chat in the desktop app. It does nothing if the app isn't installed.
export function whatsappAppLink(phone: string | null | undefined): string {
  return `whatsapp://send?phone=${whatsappNumber(phone)}`;
}
