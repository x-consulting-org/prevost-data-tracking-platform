"use client";

import { Logout } from "@carbon/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { signOut } from "@/lib/auth-client";

export function UserMenu({ user }: { user: { id: string; name: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await signOut();
      if (error) {
        throw new Error(`Sign-out failed with HTTP ${error.status}`);
      }
    },
    onSuccess: () => {
      // Nothing cached for this user may reach the next session in this tab.
      queryClient.clear();
      router.replace("/login");
    },
  });

  return (
    <div className="flex items-center gap-2 lg:rounded-xl lg:px-2 lg:py-1.5">
      {/* A phone's top bar only has room for the logout button. */}
      <span className="hidden md:contents">
        <Avatar person={user} size="md" />
      </span>
      {mutation.isError ? (
        // Below lg the top bar has no room for it, so it hangs under the bar.
        <span
          role="alert"
          className="text-xs text-attention-on-dark max-lg:absolute max-lg:top-full max-lg:right-3 max-lg:mt-1 max-lg:rounded-lg max-lg:bg-sidebar max-lg:px-3 max-lg:py-2 lg:flex-1"
        >
          A kilépés nem sikerült, próbáld újra.
        </span>
      ) : (
        <span className="hidden truncate text-sm text-white md:block lg:flex-1">{user.name}</span>
      )}
      <button
        type="button"
        aria-label="Kilépés"
        title="Kilépés"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
        className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-sidebar-text transition-colors hover:bg-sidebar-raised hover:text-white focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
      >
        <Logout size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
