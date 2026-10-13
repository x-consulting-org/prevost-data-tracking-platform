import { NotFoundMessage } from "@/components/feedback/not-found-message";

/** URLs that match no route. */
export default function RootNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12">
      <NotFoundMessage />
    </main>
  );
}
