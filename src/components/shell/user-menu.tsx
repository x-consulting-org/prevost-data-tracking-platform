"use client";

import { Logout } from "@carbon/icons-react";
import { HeaderGlobalAction } from "@carbon/react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function UserMenu({ name }: { name: string }) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: () => signOut(),
    onSuccess: () => router.replace("/login"),
  });

  return (
    <>
      <span className="hidden items-center px-4 text-sm text-text-secondary md:flex">{name}</span>
      <HeaderGlobalAction
        aria-label="Kilépés"
        tooltipAlignment="end"
        onClick={() => mutation.mutate()}
      >
        <Logout size={20} />
      </HeaderGlobalAction>
    </>
  );
}
