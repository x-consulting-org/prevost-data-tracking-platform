"use client";

import { Button, InlineNotification } from "@carbon/react";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useEffect } from "react";

/** The error boundary UI: a Hungarian message and a retry that also resets failed queries. */
export function LoadError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  // Queries that threw here stay in error until React Query's boundary is reset too.
  const { reset } = useQueryErrorResetBoundary();

  useEffect(() => {
    // The message is hidden from the client in production; the server log has the details.
    console.error(error);
  }, [error]);

  return (
    <div className="flex max-w-xl flex-col items-start gap-4">
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title="Az adatok betöltése nem sikerült."
        subtitle="Próbáld újra. Ha nem javul, szólj a rendszergazdának."
      />
      <Button
        kind="secondary"
        size="md"
        onClick={() => {
          reset();
          retry();
        }}
      >
        Újrapróbálás
      </Button>
    </div>
  );
}
