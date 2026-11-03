import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReceipt } from "@/lib/receipt-data";
import { themeOf } from "@/lib/themes";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Maintenance Receipt", robots: { index: false } };

// Needs no login: the payment's random UUID is the key to the URL, and marking the payment
// unpaid deletes the row, so the page stops working.
export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { id } = await params;
  const { print } = await searchParams;

  const receipt = await getReceipt(id);
  if (!receipt) notFound();

  return (
    <div data-skin={themeOf(receipt.theme).key} className="flex-1 bg-background font-sans text-foreground">
    <main className="mx-auto w-full max-w-md space-y-6 p-4 sm:p-8 print:max-w-none">
      <div className="space-y-5 rounded-xl border bg-card p-6 text-card-foreground print:border-0 print:p-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold break-words">{receipt.buildingName}</h1>
            <p className="text-sm text-muted-foreground">Maintenance Receipt</p>
          </div>
          <span className="shrink-0 rounded-full border px-3 py-1 text-sm font-medium">{receipt.statusLabel}</span>
        </div>
        <dl className="divide-y text-sm">
          {receipt.rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <PrintButton auto={print === "1"} />
    </main>
    </div>
  );
}
