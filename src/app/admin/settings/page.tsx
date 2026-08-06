import { getSettings } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateSettings } from "./actions";
import { DangerZone } from "./danger-zone";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Building</CardTitle>
          <CardDescription>General building details and member visibility.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateSettings} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="buildingName">Building Name</Label>
              <Input id="buildingName" name="buildingName" defaultValue={settings.buildingName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingBalance">Opening Balance</Label>
              <Input
                id="openingBalance"
                name="openingBalance"
                type="number"
                step="0.01"
                defaultValue={settings.openingBalance.toString()}
                required
              />
              <p className="text-xs text-muted-foreground">
                Your actual cash/bank balance as of today. The financial dashboard adds income and
                subtracts expenses logged from here onward.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="allowMembersViewFinancials">Members Can View Building Finances</Label>
                <p className="text-xs text-muted-foreground">
                  Lets members see total income/expenses and balance — never other residents&apos;
                  individual payments.
                </p>
              </div>
              <Switch
                id="allowMembersViewFinancials"
                name="allowMembersViewFinancials"
                defaultChecked={settings.allowMembersViewFinancials}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="allowMembersViewAllMonths">Members Can Browse All Months</Label>
                <p className="text-xs text-muted-foreground">
                  Lets members pick any past month on the Monthly Data page, not just the current
                  one. Requires "Members Can View Building Finances" above to also be on.
                </p>
              </div>
              <Switch
                id="allowMembersViewAllMonths"
                name="allowMembersViewAllMonths"
                defaultChecked={settings.allowMembersViewAllMonths}
              />
            </div>
            <Button type="submit">Save Settings</Button>
          </form>
        </CardContent>
      </Card>

      <DangerZone />
    </div>
  );
}
