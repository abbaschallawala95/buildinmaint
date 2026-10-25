import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/building-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

const PAGE_SIZE = 50;

// { amount: "1500", month: 1 } -> "amount: 1500 · month: 1" (skips empty values)
function formatDetails(details: unknown): string {
  if (!details || typeof details !== "object") return "—";
  const parts = Object.entries(details as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
  return parts.length ? parts.join(" · ") : "—";
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { buildingId } = await requireAdminContext();
  const total = await prisma.auditLog.count({ where: { buildingId } });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Math.floor(Number((await searchParams).page)) || 1));
  const logs = await prisma.auditLog.findMany({
    where: { buildingId },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No activity recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {l.createdAt.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>{l.actor?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{l.action}</Badge>
                  </TableCell>
                  <TableCell>{l.entityType}</TableCell>
                  <TableCell className="max-w-md whitespace-normal break-words text-xs text-muted-foreground">
                    {formatDetails(l.details)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {pageCount} · {total} entries
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/admin/audit-log?page=${page - 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Newer
                </Link>
              )}
              {page < pageCount && (
                <Link href={`/admin/audit-log?page=${page + 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Older
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
