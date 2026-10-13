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

/** Hours as [min, max]; every value is drawn uniformly between them. */
type Range = [number, number];

/**
 * How each colleague works, so the review has something to tell apart: reply time, time to
 * a T-Port trip, how long their unloaded trucks wait, and how often a shipment gets changed.
 */
type WorkProfile = { response: Range; decision: Range; idle: Range; changeChance: number };

const dispatchers: { name: string; mailbox: string; profile: WorkProfile }[] = [
  {
    name: "Kiss Béla",
    mailbox: "kiss.bela@prevost.example",
    profile: { response: [1.5, 4], decision: [6, 14], idle: [2, 8], changeChance: 0.15 },
  },
  {
    name: "Tóth Nóra",
    mailbox: "toth.nora@prevost.example",
    profile: { response: [0.15, 0.6], decision: [4, 10], idle: [6, 18], changeChance: 0.45 },
  },
  {
    name: "Szabó Gergely",
    mailbox: "szabo.gergely@prevost.example",
    profile: { response: [0.5, 1.5], decision: [14, 30], idle: [14, 40], changeChance: 0.3 },
  },
  {
    name: "Varga Eszter",
    mailbox: "varga.eszter@prevost.example",
    profile: { response: [0.3, 1], decision: [5, 12], idle: [5, 14], changeChance: 0.1 },
  },
  {
    name: "Horváth Ádám",
    mailbox: "horvath.adam@prevost.example",
    profile: { response: [1, 5], decision: [10, 24], idle: [8, 24], changeChance: 0.35 },
  },
];

/** Index of the colleague who lets requests go unanswered; most old unhandled ones are his. */
const slowResponderIndex = 4;

/** Trucks per colleague in the history, and how far back the history reaches. */
const historyVehiclesPerDispatcher = 2;
const historyDays = 32;
/** History ends before the boards' completed lane starts, so the boards look as before. */
const historyEndsDaysAgo = 7.5;
/** A current unload is linked to a later current trip only if it starts within this. */
const maxSeededTurnaroundHours = 48;

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

const detailChanges = [
  "Rakomány módosult: +4 raklap",
  "Lerakási cím módosult",
  "Rakodási igény módosult: emelőhátfal",
  "Kapcsolattartó módosult",
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

type PlannedShipment = {
  status: ShipmentStatus;
  statusChangedAt: Date;
  requestedAt: Date;
  dispatcherIndex: number;
  tportTripId: string | null;
  vehiclePlate: string | null;
  /** What T-Port reported; the plan is `pickupAt` / `deliveryAt`. */
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  route: (typeof routes)[number];
  pickupAt: Date | null;
  deliveryAt: Date | null;
  events: PlannedEvent[];
};

function planOperations(now: Date): PlannedShipment[] {
  const random = createRandom(2026);
  const at = (hoursFromNow: number) => new Date(now.getTime() + hoursFromNow * hourMs);
  const after = (date: Date, [min, max]: Range) =>
    new Date(date.getTime() + random.between(min, max) * hourMs);
  const earliest = (...dates: Date[]) => new Date(Math.min(...dates.map((d) => d.getTime())));
  const profileOf = (dispatcherIndex: number) => dispatchers[dispatcherIndex].profile;
  const anyDispatcher = () => Math.floor(random.between(0, dispatchers.length));

  let tripSequence = 0;
  const nextTripId = () => {
    tripSequence += 1;
    return `TP-26-${String(41000 + tripSequence * 37).slice(-5)}`;
  };
  let plateSequence = 0;
  const nextPlate = () => {
    plateSequence += 1;
    return `PRV-${String(400 + plateSequence * 7).padStart(3, "0")}`;
  };

  /** The reply that moves a request to organizing; the status change is the same moment. */
  const responseEvents = (respondedAt: Date): PlannedEvent[] => [
    {
      type: ShipmentEventType.RESPONSE_SENT,
      source: DataSource.EMAIL,
      summary: "Válasz a megbízónak",
      occurredAt: respondedAt,
    },
    {
      type: ShipmentEventType.STATUS_CHANGED,
      source: DataSource.EMAIL,
      summary: `Státusz: ${shipmentStatusLabel.ORGANIZING}`,
      occurredAt: respondedAt,
    },
  ];

  /** Mostly within minutes of plan; one in five runs late by up to four hours. */
  const actualFor = (plannedAt: Date, latestAt: Date) =>
    earliest(after(plannedAt, random.chance(0.2) ? [0.75, 4] : [-0.4, 0.4]), latestAt);

  const tripEvent = (tripId: string, linkedAt: Date): PlannedEvent => ({
    type: ShipmentEventType.TRIP_LINKED,
    source: DataSource.TPORT,
    summary: `T-Port járat: ${tripId}`,
    occurredAt: linkedAt,
  });

  /** Up to three schedule or detail changes between `from` and `until`, by the profile. */
  const changeEvents = (profile: WorkProfile, from: Date, until: Date, pickupAt: Date) => {
    const events: PlannedEvent[] = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (!random.chance(profile.changeChance)) continue;
      const occurredAt = new Date(
        from.getTime() + random.between(0.1, 1) * (until.getTime() - from.getTime()),
      );
      events.push(
        random.chance(0.6)
          ? {
              type: ShipmentEventType.SCHEDULE_CHANGED,
              source: DataSource.EMAIL,
              summary: `Felrakás időpontja módosult: ${formatDateTime(pickupAt)}`,
              occurredAt,
            }
          : {
              type: ShipmentEventType.DETAILS_CHANGED,
              source: DataSource.EMAIL,
              summary: random.pick(detailChanges),
              occurredAt,
            },
      );
    }
    return events;
  };

  const planned: PlannedShipment[] = [];

  // History: each colleague's trucks run trip after trip; the gap after each unload follows
  // the colleague's profile. All of it is completed before the boards' window.
  for (let dispatcherIndex = 0; dispatcherIndex < dispatchers.length; dispatcherIndex += 1) {
    const profile = profileOf(dispatcherIndex);
    for (let truck = 0; truck < historyVehiclesPerDispatcher; truck += 1) {
      const plate = nextPlate();
      let unloadedAt = at(-historyDays * 24 + random.between(0, 24));
      for (;;) {
        const pickupAt = after(unloadedAt, profile.idle);
        const pickedUpAt = actualFor(pickupAt, now);
        const deliveryAt = after(pickupAt, [20, 50]);
        const deliveredAt = actualFor(deliveryAt, now);
        if (deliveredAt > at(-historyEndsDaysAgo * 24)) break;

        const requestedAt = new Date(pickupAt.getTime() - random.between(18, 60) * hourMs);
        const respondedAt = after(requestedAt, profile.response);
        const tripId = nextTripId();
        const linkedAt = earliest(
          after(requestedAt, profile.decision),
          new Date(pickupAt.getTime() - 2 * hourMs),
        );
        planned.push({
          status: ShipmentStatus.COMPLETED,
          statusChangedAt: deliveredAt,
          requestedAt,
          dispatcherIndex,
          tportTripId: tripId,
          vehiclePlate: plate,
          pickedUpAt,
          deliveredAt,
          route: random.pick(routes),
          pickupAt,
          deliveryAt,
          events: [
            ...responseEvents(respondedAt),
            tripEvent(tripId, linkedAt),
            ...changeEvents(profile, requestedAt, pickupAt, pickupAt),
          ],
        });
        // The next trip is planned from the actual unload.
        unloadedAt = deliveredAt;
      }
    }
  }

  // The current state the boards show.
  for (const { status, count } of statusPlan) {
    for (let index = 0; index < count; index += 1) {
      const dispatcherIndex =
        status === ShipmentStatus.UNHANDLED && index >= 3 && index % 2 === 1
          ? slowResponderIndex
          : anyDispatcher();
      const profile = profileOf(dispatcherIndex);
      const tripId = nextTripId();

      let requestedAt: Date;
      let pickupAt: Date | null;
      let deliveryAt: Date | null;
      let tportTripId: string | null = null;
      let statusChangedAt: Date;
      let pickedUpAt: Date | null = null;
      let deliveredAt: Date | null = null;
      const events: PlannedEvent[] = [];

      switch (status) {
        case ShipmentStatus.UNHANDLED:
          // The first three are fresh, the rest have waited long enough to alert.
          requestedAt = at(index < 3 ? -random.between(0.2, 1.5) : -random.between(2.5, 30));
          pickupAt = random.chance(0.6) ? at(random.between(30, 120)) : null;
          deliveryAt = pickupAt && new Date(pickupAt.getTime() + random.between(20, 60) * hourMs);
          statusChangedAt = requestedAt;
          break;
        case ShipmentStatus.ORGANIZING:
          requestedAt = at(-random.between(20, 96));
          // 0–2: pickup within a day and no trip yet; 3: no pickup time stated.
          pickupAt =
            index === 3 ? null : at(index < 3 ? random.between(3, 22) : random.between(26, 140));
          deliveryAt = pickupAt && new Date(pickupAt.getTime() + random.between(20, 60) * hourMs);
          statusChangedAt = earliest(after(requestedAt, profile.response), at(-0.5));
          events.push(...responseEvents(statusChangedAt));
          if (index > 3 && random.chance(0.5)) {
            tportTripId = tripId;
            events.push(
              tripEvent(tripId, earliest(after(requestedAt, profile.decision), at(-0.2))),
            );
          }
          break;
        case ShipmentStatus.IN_TRANSIT:
          pickupAt = at(-random.between(4, 110));
          requestedAt = new Date(pickupAt.getTime() - random.between(36, 120) * hourMs);
          // 0–2: delivery deadline already passed.
          deliveryAt = at(index < 3 ? -random.between(1, 10) : random.between(4, 50));
          tportTripId = tripId;
          pickedUpAt = actualFor(pickupAt, at(-0.2));
          statusChangedAt = pickedUpAt;
          events.push(
            ...responseEvents(after(requestedAt, profile.response)),
            tripEvent(
              tripId,
              earliest(after(requestedAt, profile.decision), new Date(pickupAt.getTime() - hourMs)),
            ),
          );
          break;
        case ShipmentStatus.COMPLETED:
          // The last three finished more than a week ago and drop off the boards.
          deliveryAt = at(index < 9 ? -random.between(4, 150) : -random.between(200, 300));
          pickupAt = new Date(deliveryAt.getTime() - random.between(20, 60) * hourMs);
          requestedAt = new Date(pickupAt.getTime() - random.between(36, 120) * hourMs);
          tportTripId = tripId;
          pickedUpAt = actualFor(pickupAt, at(-4));
          deliveredAt = actualFor(deliveryAt, at(-0.5));
          statusChangedAt = deliveredAt;
          events.push(
            ...responseEvents(after(requestedAt, profile.response)),
            tripEvent(
              tripId,
              earliest(after(requestedAt, profile.decision), new Date(pickupAt.getTime() - hourMs)),
            ),
          );
          break;
        case ShipmentStatus.CANCELLED:
          requestedAt = at(-random.between(30, 120));
          pickupAt = null;
          deliveryAt = null;
          statusChangedAt = new Date(requestedAt.getTime() + random.between(2, 20) * hourMs);
          events.push(...responseEvents(after(requestedAt, [0.2, 1.5])), {
            type: ShipmentEventType.STATUS_CHANGED,
            source: DataSource.EMAIL,
            summary: "A megbízó lemondta a fuvart",
            occurredAt: statusChangedAt,
          });
          break;
      }

      if (pickupAt !== null && status !== ShipmentStatus.UNHANDLED) {
        // Changes happen while the shipment is being organised, never later than now.
        events.push(
          ...changeEvents(profile, requestedAt, earliest(pickupAt, statusChangedAt, now), pickupAt),
        );
      }

      planned.push({
        status,
        statusChangedAt,
        requestedAt,
        dispatcherIndex,
        tportTripId,
        // Assigned below, once every current shipment is planned.
        vehiclePlate: null,
        pickedUpAt,
        deliveredAt,
        route: random.pick(routes),
        pickupAt,
        deliveryAt,
        events,
      });
    }
  }

  // Trucks the current shipments unloaded take the next current trips that start after the
  // unload, so the cards can show both reloaded and still waiting trucks.
  const current = planned.filter((shipment) => shipment.vehiclePlate === null);
  const unloaded = current
    .flatMap((shipment) =>
      shipment.deliveredAt === null ? [] : [{ deliveredAt: shipment.deliveredAt, shipment }],
    )
    .toSorted((a, b) => a.deliveredAt.getTime() - b.deliveredAt.getTime());
  for (const shipment of current.filter((s) => s.tportTripId !== null)) {
    shipment.vehiclePlate = nextPlate();
  }
  // A trip starts at its actual pickup, or its planned one while not yet picked up.
  const takers = current
    .flatMap((shipment) => {
      const startsAt = shipment.pickedUpAt ?? shipment.pickupAt;
      return shipment.tportTripId !== null && shipment.deliveredAt === null && startsAt !== null
        ? [{ startsAt, shipment }]
        : [];
    })
    .toSorted((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  for (const { deliveredAt, shipment } of unloaded) {
    const takerIndex = takers.findIndex(
      ({ startsAt }) =>
        startsAt > deliveredAt &&
        startsAt.getTime() - deliveredAt.getTime() <= maxSeededTurnaroundHours * hourMs,
    );
    if (takerIndex === -1) continue;
    const [taker] = takers.splice(takerIndex, 1);
    taker.shipment.vehiclePlate = shipment.vehiclePlate;
  }

  return planned;
}

async function seedOperations(now: Date) {
  const random = createRandom(2027);
  const planned = planOperations(now).toSorted(
    (a, b) => a.requestedAt.getTime() - b.requestedAt.getTime(),
  );

  await prisma.$transaction(
    async (tx) => {
      await tx.shipment.deleteMany();
      await tx.vehicle.deleteMany();
      await tx.customer.deleteMany();
      await tx.dispatcher.deleteMany();
      await tx.sourceSync.deleteMany();

      const dispatcherRows = await tx.dispatcher.createManyAndReturn({
        data: dispatchers.map(({ name, mailbox }) => ({ name, mailbox })),
        select: { id: true, mailbox: true },
      });
      const customerRows = await tx.customer.createManyAndReturn({
        data: customers.map((name) => ({ name })),
        select: { id: true, name: true },
      });
      const vehicleRows = await tx.vehicle.createManyAndReturn({
        data: [
          ...new Set(planned.flatMap(({ vehiclePlate }) => (vehiclePlate ? [vehiclePlate] : []))),
        ].map((plate) => ({ plate })),
        select: { id: true, plate: true },
      });
      const dispatcherId = (index: number) => {
        const row = dispatcherRows.find((d) => d.mailbox === dispatchers[index].mailbox);
        if (row === undefined) throw new Error(`Dispatcher ${index} was not created`);
        return row.id;
      };
      const vehicleId = (plate: string | null) => {
        if (plate === null) return null;
        const row = vehicleRows.find((vehicle) => vehicle.plate === plate);
        if (row === undefined) throw new Error(`Vehicle ${plate} was not created`);
        return row.id;
      };

      // References follow the request order, as a mailbox would number them.
      for (const [index, shipment] of planned.entries()) {
        const [originCity, originCountry, destinationCity, destinationCountry] = shipment.route;
        const customer = random.pick(customerRows);
        const route = `${originCity} ${originCountry} → ${destinationCity} ${destinationCountry}`;

        await tx.shipment.create({
          data: {
            reference: `PRV-2026-${String(index + 1).padStart(4, "0")}`,
            status: shipment.status,
            statusChangedAt: shipment.statusChangedAt,
            requestedAt: shipment.requestedAt,
            dispatcherId: dispatcherId(shipment.dispatcherIndex),
            customerId: customer.id,
            tportTripId: shipment.tportTripId,
            vehicleId: vehicleId(shipment.vehiclePlate),
            originCity,
            originCountry,
            destinationCity,
            destinationCountry,
            pickupAt: shipment.pickupAt,
            deliveryAt: shipment.deliveryAt,
            cargoDescription: random.chance(0.85) ? random.pick(cargo) : null,
            specialRequirements: random.chance(0.3) ? random.pick(specialRequirements) : null,
            events: {
              createMany: {
                data: [
                  {
                    type: ShipmentEventType.REQUEST_RECEIVED,
                    source: DataSource.EMAIL,
                    summary: `Igény érkezett: ${customer.name}, ${route}`,
                    occurredAt: shipment.requestedAt,
                  },
                  ...shipment.events,
                  ...(shipment.pickedUpAt === null
                    ? []
                    : [
                        {
                          type: ShipmentEventType.PICKED_UP,
                          source: DataSource.TPORT,
                          summary: "Felrakás megtörtént",
                          occurredAt: shipment.pickedUpAt,
                        },
                      ]),
                  ...(shipment.deliveredAt === null
                    ? []
                    : [
                        {
                          type: ShipmentEventType.DELIVERED,
                          source: DataSource.TPORT,
                          summary: "Lerakás megtörtént",
                          occurredAt: shipment.deliveredAt,
                        },
                      ]),
                ],
              },
            },
          },
        });
      }

      const at = (hoursFromNow: number) => new Date(now.getTime() + hoursFromNow * hourMs);
      await tx.sourceSync.createMany({
        data: [
          { source: DataSource.EMAIL, lastSyncedAt: at(-0.12) },
          { source: DataSource.TPORT, lastSyncedAt: at(-3.2) },
        ],
      });
    },
    // About two hundred sequential writes; Prisma's 5 s default is far too tight for that.
    { timeout: 120_000 },
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
