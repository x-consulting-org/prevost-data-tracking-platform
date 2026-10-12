/**
 * Demo data for the phase-0 dashboard (ADR 0001). It stands in for mailbox and
 * T-Port ingestion and writes the same tables they will.
 *
 * Deterministic (fixed PRNG seed, times relative to the run), atomic (domain
 * tables are replaced in one transaction) and safe to re-run.
 */
import { DataSource, ShipmentEventType, ShipmentStatus } from "../src/generated/prisma/enums";
import { auth } from "../src/lib/auth";
import { formatDateTime } from "../src/lib/format";
import { prisma } from "../src/lib/prisma";
import { shipmentStatusLabel } from "../src/lib/shipments/status";
import { hourMs } from "../src/lib/time";

const demoUser = { email: "demo@prevost.example", name: "Demo Vezető" };

const dispatchers = [
  { name: "Kiss Béla", mailbox: "kiss.bela@prevost.example" },
  { name: "Tóth Nóra", mailbox: "toth.nora@prevost.example" },
  { name: "Szabó Gergely", mailbox: "szabo.gergely@prevost.example" },
  { name: "Varga Eszter", mailbox: "varga.eszter@prevost.example" },
  { name: "Horváth Ádám", mailbox: "horvath.adam@prevost.example" },
];

const customers = [
  "Dunamenti Gépgyártó Kft.",
  "Alföldi Konzerv Zrt.",
  "Bakony Faipari Kft.",
  "Tisza Vegyiáru Kft.",
  "Mecsek Csomagolás Kft.",
  "Kisalföld Bútor Kft.",
  "Pannon Acélszerkezet Zrt.",
  "Balaton Italgyártó Kft.",
  "Mátra Üvegipari Kft.",
  "Hegyalja Borászat Kft.",
  "Zemplén Papír Kft.",
  "Somogy Agrár Zrt.",
];

const routes: [string, string, string, string][] = [
  ["Győr", "HU", "München", "DE"],
  ["Budapest", "HU", "Milánó", "IT"],
  ["Kecskemét", "HU", "Lyon", "FR"],
  ["Székesfehérvár", "HU", "Stuttgart", "DE"],
  ["Debrecen", "HU", "Kraków", "PL"],
  ["Miskolc", "HU", "Brno", "CZ"],
  ["Szeged", "HU", "Temesvár", "RO"],
  ["Pécs", "HU", "Zágráb", "HR"],
  ["Budapest", "HU", "Rotterdam", "NL"],
  ["Tatabánya", "HU", "Bécs", "AT"],
  ["Nyíregyháza", "HU", "Kassa", "SK"],
  ["Győr", "HU", "Verona", "IT"],
  ["Budapest", "HU", "Barcelona", "ES"],
  ["Zalaegerszeg", "HU", "Ljubljana", "SI"],
];

const cargo = [
  "33 EUR raklap gépalkatrész",
  "Konzervek, 24 t",
  "Bútorlap, ponyvás",
  "Vegyi áru, ADR 3. osztály",
  "Hullámkarton tekercsek",
  "Acélszerkezet, túlméretes",
  "Palackozott ital, 26 raklap",
  "Síküveg állványon",
];

const specialRequirements = [
  "Hűtött szállítás, 2–8 °C",
  "Emelőhátfal szükséges",
  "ADR felszereltség",
  "Időablak: 06:00–10:00",
];

/** Shipments per status, and how many of each get a deliberately alert-worthy setup. */
const statusPlan: { status: ShipmentStatus; count: number }[] = [
  { status: ShipmentStatus.UNHANDLED, count: 10 },
  { status: ShipmentStatus.ORGANIZING, count: 18 },
  { status: ShipmentStatus.IN_TRANSIT, count: 16 },
  { status: ShipmentStatus.COMPLETED, count: 12 },
  { status: ShipmentStatus.CANCELLED, count: 4 },
];

/** mulberry32: small seeded PRNG so every run produces the same data relative to `now`. */
function createRandom(seed: number) {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  return {
    between: (min: number, max: number) => min + next() * (max - min),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    chance: (probability: number) => next() < probability,
  };
}

type PlannedEvent = {
  type: ShipmentEventType;
  source: DataSource;
  summary: string;
  occurredAt: Date;
};

async function seedDemoUser() {
  const password = process.env.DEMO_USER_PASSWORD;
  if (password === undefined) {
    throw new Error("DEMO_USER_PASSWORD is not set");
  }

  const context = await auth.$context;
  // Creating the user directly skips sign-in's checks, so the length rule is applied here.
  const { minPasswordLength } = context.password.config;
  if (password.length < minPasswordLength) {
    throw new Error(`DEMO_USER_PASSWORD must be at least ${minPasswordLength} characters`);
  }
  const hash = await context.password.hash(password);
  // Converges on every run: a user left half-created by an earlier failure gets its password,
  // and a changed DEMO_USER_PASSWORD is applied to the existing account.
  const existing = await context.internalAdapter.findUserByEmail(demoUser.email);
  const user =
    existing === null
      ? await context.internalAdapter.createUser(
          { ...demoUser, emailVerified: true },
          { method: "email-password" },
        )
      : existing.user;

  if ((await context.internalAdapter.findCredentialAccount(user.id)) === null) {
    await context.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: hash,
    });
  } else {
    await context.internalAdapter.updatePassword(user.id, hash);
  }
}

async function seedOperations(now: Date) {
  const random = createRandom(2026);
  const at = (hoursFromNow: number) => new Date(now.getTime() + hoursFromNow * hourMs);

  await prisma.$transaction(
    async (tx) => {
      await tx.shipment.deleteMany();
      await tx.customer.deleteMany();
      await tx.dispatcher.deleteMany();
      await tx.sourceSync.deleteMany();

      const dispatcherRows = await tx.dispatcher.createManyAndReturn({
        data: dispatchers,
        select: { id: true },
      });
      const customerRows = await tx.customer.createManyAndReturn({
        data: customers.map((name) => ({ name })),
        select: { id: true, name: true },
      });

      let sequence = 101;
      for (const { status, count } of statusPlan) {
        for (let index = 0; index < count; index += 1) {
          const reference = `PRV-2026-${String(sequence).padStart(4, "0")}`;
          sequence += 1;

          const [originCity, originCountry, destinationCity, destinationCountry] =
            random.pick(routes);
          const customer = random.pick(customerRows);
          const route = `${originCity} ${originCountry} → ${destinationCity} ${destinationCountry}`;
          const tripId = `TP-26-${String(40000 + sequence * 37).slice(-5)}`;

          let requestedAt: Date;
          let pickupAt: Date | null;
          let deliveryAt: Date | null;
          let tportTripId: string | null = null;
          let statusChangedAt: Date;
          const events: PlannedEvent[] = [];

          switch (status) {
            case ShipmentStatus.UNHANDLED:
              // The first three are fresh, the rest have waited long enough to alert.
              requestedAt = at(index < 3 ? -random.between(0.2, 1.5) : -random.between(2.5, 30));
              pickupAt = random.chance(0.6) ? at(random.between(30, 120)) : null;
              deliveryAt =
                pickupAt && new Date(pickupAt.getTime() + random.between(20, 60) * hourMs);
              statusChangedAt = requestedAt;
              break;
            case ShipmentStatus.ORGANIZING:
              requestedAt = at(-random.between(20, 96));
              // 0–2: pickup within a day and no trip yet; 3: no pickup time stated.
              pickupAt =
                index === 3
                  ? null
                  : at(index < 3 ? random.between(3, 22) : random.between(26, 140));
              deliveryAt =
                pickupAt && new Date(pickupAt.getTime() + random.between(20, 60) * hourMs);
              tportTripId = index > 3 && random.chance(0.5) ? tripId : null;
              statusChangedAt = new Date(requestedAt.getTime() + random.between(0.5, 4) * hourMs);
              events.push({
                type: ShipmentEventType.STATUS_CHANGED,
                source: DataSource.EMAIL,
                summary: `Státusz: ${shipmentStatusLabel.ORGANIZING}`,
                occurredAt: statusChangedAt,
              });
              break;
            case ShipmentStatus.IN_TRANSIT:
              pickupAt = at(-random.between(4, 60));
              requestedAt = new Date(pickupAt.getTime() - random.between(36, 120) * hourMs);
              // 0–2: delivery deadline already passed.
              deliveryAt = at(index < 3 ? -random.between(1, 10) : random.between(4, 50));
              tportTripId = tripId;
              statusChangedAt = pickupAt;
              events.push({
                type: ShipmentEventType.STATUS_CHANGED,
                source: DataSource.TPORT,
                summary: "Felrakás megtörtént",
                occurredAt: pickupAt,
              });
              break;
            case ShipmentStatus.COMPLETED:
              // The last three finished more than a week ago and drop off the boards.
              deliveryAt = at(index < 9 ? -random.between(4, 150) : -random.between(200, 300));
              pickupAt = new Date(deliveryAt.getTime() - random.between(20, 60) * hourMs);
              requestedAt = new Date(pickupAt.getTime() - random.between(36, 120) * hourMs);
              tportTripId = tripId;
              statusChangedAt = deliveryAt;
              events.push({
                type: ShipmentEventType.STATUS_CHANGED,
                source: DataSource.TPORT,
                summary: "Lerakás megtörtént",
                occurredAt: deliveryAt,
              });
              break;
            case ShipmentStatus.CANCELLED:
              requestedAt = at(-random.between(30, 120));
              pickupAt = null;
              deliveryAt = null;
              statusChangedAt = new Date(requestedAt.getTime() + random.between(2, 20) * hourMs);
              events.push({
                type: ShipmentEventType.STATUS_CHANGED,
                source: DataSource.EMAIL,
                summary: "A megbízó lemondta a fuvart",
                occurredAt: statusChangedAt,
              });
              break;
          }

          events.push({
            type: ShipmentEventType.REQUEST_RECEIVED,
            source: DataSource.EMAIL,
            summary: `Igény érkezett: ${customer.name}, ${route}`,
            occurredAt: requestedAt,
          });
          if (tportTripId !== null) {
            events.push({
              type: ShipmentEventType.TRIP_LINKED,
              source: DataSource.TPORT,
              summary: `T-Port járat: ${tportTripId}`,
              occurredAt: new Date(requestedAt.getTime() + random.between(4, 18) * hourMs),
            });
          }
          if (pickupAt !== null && random.chance(0.35)) {
            events.push({
              type: ShipmentEventType.SCHEDULE_CHANGED,
              source: DataSource.EMAIL,
              summary: `Felrakás időpontja módosult: ${formatDateTime(pickupAt)}`,
              // Within three hours of the request, and never later than now.
              occurredAt: new Date(
                requestedAt.getTime() +
                  random.between(0.1, 1) *
                    Math.min(3 * hourMs, now.getTime() - requestedAt.getTime()),
              ),
            });
          }

          await tx.shipment.create({
            data: {
              reference,
              status,
              statusChangedAt,
              requestedAt,
              dispatcherId: random.pick(dispatcherRows).id,
              customerId: customer.id,
              tportTripId,
              originCity,
              originCountry,
              destinationCity,
              destinationCountry,
              pickupAt,
              deliveryAt,
              cargoDescription: random.chance(0.85) ? random.pick(cargo) : null,
              specialRequirements: random.chance(0.3) ? random.pick(specialRequirements) : null,
              events: { createMany: { data: events } },
            },
          });
        }
      }

      await tx.sourceSync.createMany({
        data: [
          { source: DataSource.EMAIL, lastSyncedAt: at(-0.12) },
          { source: DataSource.TPORT, lastSyncedAt: at(-3.2) },
        ],
      });
    },
    // About sixty sequential writes; Prisma's 5 s default is tight against a remote database.
    { timeout: 30_000 },
  );
}

async function main() {
  await seedDemoUser();
  await seedOperations(new Date());
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
