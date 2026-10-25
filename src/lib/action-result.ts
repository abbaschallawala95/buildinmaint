import "server-only";
import { unstable_rethrow } from "next/navigation";

export type ActionResult = { error?: string };

// Wraps a server action so expected failures come back as { error } instead of being thrown.
// Thrown errors are redacted in production and crash the page; returned ones reach the form.
export function withErrors<Args extends unknown[]>(
  fn: (...args: Args) => Promise<unknown>,
): (...args: Args) => Promise<ActionResult> {
  return async (...args) => {
    try {
      await fn(...args);
      return {};
    } catch (e) {
      unstable_rethrow(e); // let redirect()/notFound() through
      return { error: toMessage(e) };
    }
  };
}

function toMessage(e: unknown): string {
  const err = e as { name?: string; code?: string } | null;
  if (err?.name === "ZodError") return "Some fields are missing or invalid. Please check the form.";
  if (err?.code === "P2002") return "That already exists. Please use a different name or number.";
  if (err?.code === "P2003") return "This is still in use elsewhere and can't be removed.";
  // Our own `throw new Error("...")` messages are written for users; anything else is internal.
  if (e instanceof Error && e.constructor === Error && e.message) return e.message;
  console.error(e);
  return "Something went wrong. Please try again.";
}
