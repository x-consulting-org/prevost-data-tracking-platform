"use client";

import { useEffect } from "react";

/**
 * Replaces the root layout when that fails, so none of the app's styles, fonts or providers are
 * available; this page styles itself.
 */
export default function GlobalError({
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
    <html lang="hu">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", color: "#1c1a17" }}>
        <title>Hiba · Prévost</title>
        <main style={{ maxWidth: "36rem", margin: "0 auto", padding: "3rem 1rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Az oldal betöltése nem sikerült.</h1>
          <p>Próbáld újra. Ha nem javul, szólj a rendszergazdának.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ font: "inherit", padding: "0.5rem 1rem" }}
          >
            Újrapróbálás
          </button>
        </main>
      </body>
    </html>
  );
}
