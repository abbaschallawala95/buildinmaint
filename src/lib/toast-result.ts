import { toast } from "sonner";

// Client side of withErrors(): shows the action's error as a toast. Returns true on success.
export async function succeeded(result: Promise<{ error?: string } | void>): Promise<boolean> {
  const r = await result;
  if (r?.error) {
    toast.error(r.error);
    return false;
  }
  return true;
}
