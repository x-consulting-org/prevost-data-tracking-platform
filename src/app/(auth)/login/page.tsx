import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Belépés",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <Image src="/prevost-logo.png" alt="Prévost Hungaria" width={180} height={32} priority />
        <section className="flex flex-col gap-6 bg-layer p-8" aria-labelledby="login-title">
          <h1 id="login-title" className="text-2xl">
            Belépés
          </h1>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
