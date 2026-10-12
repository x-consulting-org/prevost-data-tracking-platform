"use client";

import { Button, InlineNotification } from "@carbon/react";
import { useEffect } from "react";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
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
      <Button kind="secondary" size="md" onClick={() => retry()}>
        Újrapróbálás
      </Button>
    </div>
  );
}
