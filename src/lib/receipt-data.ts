import "server-only";
import { prisma } from "@/lib/prisma";
import { rateForMonth } from "@/lib/rate-history";
import { paymentState } from "@/lib/maintenance-dues";
import { MONTH_NAMES } from "@/lib/analytics";
import { receiptDate, receiptNumber } from "@/lib/receipt";

const METHODS: Record<string, string> = { CASH: "Cash", UPI: "UPI", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque", OTHER: "Other" };

// What the receipt page and the receipt image both show. Null when there is no receipt: unknown
// id, a payment marked unpaid (the row is deleted), or one from before receipts began.
export async function getReceipt(id: string) {
  const payment = await prisma.maintenancePayment.findUnique({
    where: { id },
    include: { flat: { include: { floor: { include: { building: { include: { settings: true } } } }, member: true, maintenanceRates: true } } },
  });
  if (!payment || payment.receiptNumber === null) return null;

  const { flat } = payment;
  const rate = rateForMonth(
    flat.maintenanceRates.map((r) => ({
      amount: Number(r.amount),
      effectiveMonth: r.effectiveMonth,
      effectiveYear: r.effectiveYear,
    })),
    payment.month,
    payment.year,
  );
  const { paid, remaining, status } = paymentState(rate, payment);
  if (status === "UNPAID") return null;

  const rows: [string, string][] = [
    ["Receipt No.", receiptNumber(payment.receiptNumber)],
    ["Flat No.", `${flat.floor.name} / ${flat.flatNumber}`],
    ["Member", flat.member?.name ?? "—"],
    ["Month", `${MONTH_NAMES[payment.month - 1]} ${payment.year}`],
    ["Date", receiptDate(payment.paymentDate) ?? "—"],
    ["Method", payment.paymentMethod ? METHODS[payment.paymentMethod] : "—"],
    ["Maintenance Amount", `₹${rate.toFixed(2)}`],
    ["Amount Paid", `₹${paid.toFixed(2)}`],
  ];
  if (status === "PARTIAL") rows.push(["Balance Remaining", `₹${remaining.toFixed(2)}`]);

  return {
    buildingName: flat.floor.building.name,
    theme: flat.floor.building.settings?.theme,
    statusLabel: status === "PAID" ? "Paid" : "Part Paid",
    rows,
  };
}
