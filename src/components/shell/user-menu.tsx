"use client";

import { Logout } from "@carbon/icons-react";
import { HeaderGlobalAction } from "@carbon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function UserMenu({ name }: { name: string }) {
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
    <>
      {mutation.isError ? (
        <span role="alert" className="flex items-center px-4 text-sm text-support-error">
          A kilépés nem sikerült, próbáld újra.
        </span>
      ) : (
        <span className="hidden items-center px-4 text-sm text-text-secondary md:flex">{name}</span>
      )}
      <HeaderGlobalAction
        aria-label="Kilépés"
        tooltipAlignment="end"
        onClick={() => {
          if (!mutation.isPending) mutation.mutate();
        }}
      >
        <Logout size={20} />
      </HeaderGlobalAction>
    </>
  );
}
