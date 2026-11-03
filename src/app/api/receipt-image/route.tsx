import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getReceipt } from "@/lib/receipt-data";

const WIDTH = 800;
const lines = (text: string, perLine: number) => Math.max(1, Math.ceil(text.length / perLine));

// The receipt as a PNG, for sending on WhatsApp. Needs no login, like the receipt page: the
// payment's random UUID is the key.
export async function GET(request: NextRequest) {
  const receipt = await getReceipt(request.nextUrl.searchParams.get("id") ?? "");
  if (!receipt) return new Response("Not found", { status: 404 });

  // Satori needs a fixed height, so long names get room for the lines they will wrap onto.
  const height =
    150 +
    lines(receipt.buildingName, 28) * 46 +
    receipt.rows.reduce((sum, [, value]) => sum + 28 + lines(value, 30) * 36, 0);

  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", backgroundColor: "#ffffff", color: "#111827" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", backgroundColor: "#4f46e5", color: "#ffffff", padding: "32px 40px" }}>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 540 }}>
          <div style={{ fontSize: 38, fontWeight: 700 }}>{receipt.buildingName}</div>
          <div style={{ fontSize: 24, marginTop: 6 }}>Maintenance Receipt</div>
        </div>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 700, backgroundColor: "#ffffff", color: "#4f46e5", borderRadius: 999, padding: "8px 22px" }}>
          {receipt.statusLabel}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "8px 40px" }}>
        {receipt.rows.map(([label, value]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #e5e7eb", fontSize: 28 }}>
            <div style={{ display: "flex", color: "#6b7280" }}>{label}</div>
            <div style={{ display: "flex", maxWidth: 440, textAlign: "right", fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>,
    // next/og caches for a year by default; a part payment's receipt changes when the rest is paid.
    { width: WIDTH, height, headers: { "Cache-Control": "no-store" } },
  );
}
