/** Background and text pairs for avatars; every pair is above 4.5:1. */
const avatarColors = [
  "bg-[#e7eefc] text-[#1f4bb0]",
  "bg-[#e2f4ec] text-[#11704a]",
  "bg-[#fdecec] text-[#a8242a]",
  "bg-[#efe9fb] text-[#5b3cb0]",
  "bg-[#e3f3f6] text-[#0f6575]",
  "bg-[#fbeee4] text-[#97481a]",
] as const;

/** The same person always gets the same colour, on every screen and in every session. */
function avatarColor(id: string): string {
  let hash = 0;
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return avatarColors[hash % avatarColors.length];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("hu-HU"))
    .join("");
}

const sizeClassName = {
  sm: "size-5 text-[0.625rem]",
  md: "size-7 text-xs",
  lg: "size-10 text-sm",
} as const;

/** A person's initials. Decorative: their name is always shown or announced next to it. */
export function Avatar({
  person,
  size,
}: {
  person: { id: string; name: string };
  size: keyof typeof sizeClassName;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizeClassName[size]} ${avatarColor(person.id)}`}
    >
      {initials(person.name)}
    </span>
  );
}
