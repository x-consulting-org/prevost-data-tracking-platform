/** The country as the oval code sticker on the back of a truck: "HU", "CZ", "RO". */
export function CountryCode({ code }: { code: string }) {
  return (
    <span className="inline-flex h-4 shrink-0 items-center rounded-[50%] border border-current px-1.5 text-[0.625rem] leading-none font-semibold tracking-wide text-text-secondary">
      {code}
    </span>
  );
}
