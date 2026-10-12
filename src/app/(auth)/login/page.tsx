import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Belépés",
};

/** The board's route motif drawn large: a pickup, a road in the brand orange, a delivery. */
function RouteMotif() {
  return (
    <svg
      viewBox="0 0 320 200"
      aria-hidden="true"
      className="w-full max-w-sm text-brand"
      fill="none"
    >
      <path
        d="M24 168 C 110 168, 90 40, 180 40 S 280 110, 296 32"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M24 168 C 110 168, 90 40, 180 40 S 280 110, 296 32"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="10 10"
        strokeLinecap="round"
      />
      <circle cx="24" cy="168" r="9" fill="currentColor" />
      <circle
        cx="296"
        cy="32"
        r="9"
        className="fill-asphalt"
        stroke="currentColor"
        strokeWidth="4"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <main className="grid flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="hidden flex-col justify-between gap-12 bg-asphalt p-12 lg:flex">
        <Image src="/prevost-logo.png" alt="Prévost Hungaria" width={180} height={32} priority />
        <RouteMotif />
        <p className="max-w-sm text-2xl leading-snug font-medium text-white">
          A fuvarok, a kollégák és a figyelmet igénylő ügyek egy helyen.
        </p>
      </section>
      <div className="flex items-center justify-center px-4 py-16">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="w-fit rounded-xl bg-asphalt px-4 py-3 lg:hidden">
            <Image
              src="/prevost-logo.png"
              alt="Prévost Hungaria"
              width={140}
              height={25}
              priority
            />
          </div>
          <section className="flex flex-col gap-6" aria-labelledby="login-title">
            <header className="flex flex-col gap-1">
              <h1 id="login-title" className="text-2xl font-semibold tracking-tight">
                Belépés
              </h1>
              <p className="text-sm text-text-secondary">
                A Prévost operációs áttekintéséhez lépj be a céges fiókoddal.
              </p>
            </header>
            <LoginForm />
          </section>
        </div>
      </div>
    </main>
  );
}
