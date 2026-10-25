"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

// Submit button for a server-rendered <form action={...}> that asks before submitting.
export function ConfirmSubmitButton({
  confirmMessage,
  children,
  ...props
}: { confirmMessage: string } & React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button
      {...props}
      type="submit"
      disabled={pending || props.disabled}
      onClick={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
