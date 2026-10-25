import { requireSuperAdmin } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { THEMES, themeOf } from "@/lib/themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ThemePicker } from "./theme-picker";

export default async function ThemesPage() {
  await requireSuperAdmin();
  const buildings = await prisma.building.findMany({ orderBy: { name: "asc" }, include: { settings: true } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Themes</h1>
        <p className="text-sm text-muted-foreground">
          Choose the look for each building. Its building admin and all its members see that building&apos;s
          theme; everyone can still pick Light, Dark or Auto for themes that support it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {THEMES.map((t) => {
          const [side, accent, page] = t.swatches;
          return (
            <Card key={t.key} className="gap-3 overflow-hidden py-0">
              {/* Mini preview: sidebar, page and an accent button, in the theme's own colours */}
              <div className="flex h-24 border-b" style={{ background: page }}>
                <div className="w-1/4 space-y-1.5 p-2" style={{ background: side, borderRight: "1px solid rgb(0 0 0 / 8%)" }}>
                  <span className="block h-2 w-3/4 rounded-full" style={{ background: accent }} />
                  <span className="block h-1.5 w-full rounded-full opacity-40" style={{ background: side.startsWith("#F") ? "#98A2B3" : "#FFFFFF" }} />
                  <span className="block h-1.5 w-2/3 rounded-full opacity-40" style={{ background: side.startsWith("#F") ? "#98A2B3" : "#FFFFFF" }} />
                </div>
                <div className="flex-1 space-y-2 p-3">
                  <span className="block h-2.5 w-1/2 rounded-full bg-black/15" />
                  <div className="grid grid-cols-2 gap-1.5">
                    <span className="block h-6 rounded-md bg-white shadow-sm" />
                    <span className="block h-6 rounded-md bg-white shadow-sm" />
                  </div>
                  <span className="block h-4 w-16 rounded-md" style={{ background: accent }} />
                </div>
              </div>
              <CardContent className="space-y-2 px-4 pb-4">
                <p className="text-lg font-semibold" style={{ fontFamily: `var(${t.fontVar})` }}>
                  {t.name}
                </p>
                <p className="text-sm text-muted-foreground">{t.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{t.font}</Badge>
                  <Badge variant="secondary">{t.darkMode ? "Light & dark" : "Light only"}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buildings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Building</TableHead>
                <TableHead>Current theme</TableHead>
                <TableHead>Change to</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No buildings yet.
                  </TableCell>
                </TableRow>
              )}
              {buildings.map((b) => {
                const current = themeOf(b.settings?.theme);
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <span className="size-3 rounded-full" style={{ background: current.swatches[1] }} />
                        {current.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ThemePicker buildingId={b.id} buildingName={b.name} current={current.key} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
