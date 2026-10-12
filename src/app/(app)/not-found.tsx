import NextLink from "next/link";

export default function AppNotFound() {
  return (
    <div className="flex max-w-xl flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Nincs ilyen oldal</h1>
      <p className="text-text-secondary">
        A cím hibás, vagy olyan adatra mutat, ami nincs a rendszerben.
      </p>
      <NextLink
        href="/shipments"
        className="text-link-primary hover:underline focus-visible:outline-2 focus-visible:outline-focus"
      >
        Vissza a Fuvarokhoz
      </NextLink>
    </div>
  );
}
