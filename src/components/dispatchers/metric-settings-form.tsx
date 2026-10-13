"use client";

import { ActionableNotification, Button, InlineNotification } from "@carbon/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useForm, useFormState, type UseFormReturn } from "react-hook-form";
import { saveMetricSettings } from "@/actions/metric-settings";
import { formatDateTime } from "@/lib/format";
import { reviewMetricText, type ReviewMetricId } from "@/lib/performance/review";
import { metricSettingsSchema, type MetricSettings } from "@/lib/performance/settings";
import { queryKeys } from "@/lib/query-keys";

type Form = UseFormReturn<MetricSettings>;

/** A number typed into the sentence it belongs to; the sentence is its label. */
function NumberField({
  form,
  name,
  label,
  width,
}: {
  form: Form;
  name: keyof MetricSettings;
  label: string;
  width: "narrow" | "wide";
}) {
  // Subscribed here: the form only re-renders for the state its own render reads.
  const error = useFormState({ control: form.control, name }).errors[name];

  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={label}
      aria-invalid={error !== undefined}
      aria-describedby={error === undefined ? undefined : `${name}-error`}
      className={`${width === "narrow" ? "w-[3.5rem]" : "w-[4.5rem]"} mx-1 inline-block h-8 [appearance:textfield] border-0 border-b border-border-strong bg-layer px-1.5 text-right font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus aria-invalid:border-attention aria-invalid:text-attention-ink [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      {...form.register(name, { valueAsNumber: true })}
    />
  );
}

/** A rule as a sentence, with the errors of its fields under it. */
function Rule({
  form,
  names,
  children,
}: {
  form: Form;
  names: (keyof MetricSettings)[];
  children: ReactNode;
}) {
  const { errors: fieldErrors } = useFormState({ control: form.control, name: names });
  const errors = names.flatMap((name) => {
    const message = fieldErrors[name]?.message;
    return message === undefined ? [] : [{ name, message }];
  });

  return (
    <div className="flex flex-col gap-1">
      <p className="leading-10">{children}</p>
      {errors.map(({ name, message }) => (
        <p key={name} id={`${name}-error`} className="text-sm text-attention-ink">
          {message}
        </p>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border-subtle pt-6">
      <h2 className="text-lg/7 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** What a metric measures, and the rule it uses when it has one. */
function MetricDefinition({ id, children }: { id: ReviewMetricId; children?: ReactNode }) {
  const text = reviewMetricText[id];

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-base font-semibold">{text.label}</h3>
      <p className="text-text-secondary">{text.definition}</p>
      {children}
    </div>
  );
}

/**
 * How the review, the alerts and the shipment cards measure, with the thresholds editable in
 * place. A save names the version it started from, so it cannot overwrite a newer one.
 */
export function MetricSettingsForm({
  settings,
  updatedAt,
}: {
  settings: MetricSettings;
  updatedAt: Date;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<MetricSettings>({
    resolver: zodResolver(metricSettingsSchema),
    defaultValues: settings,
  });

  const mutation = useMutation({
    mutationFn: (values: MetricSettings) =>
      saveMetricSettings({ settings: values, expectedUpdatedAt: updatedAt }),
    onSuccess: async (result) => {
      if (result.status === "conflict") return;
      // The alerts on the Fuvarok screens were computed with the old thresholds.
      await queryClient.invalidateQueries({ queryKey: queryKeys.shipments.all });
      router.refresh();
    },
  });

  const conflict = mutation.data?.status === "conflict";
  const { isDirty } = form.formState;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      className="flex max-w-[72ch] flex-col gap-8 pb-24"
    >
      <p className="text-text-secondary">
        Ezek a szabályok számolják az értékelést, a Fuvarok kártyáin az időket és a
        figyelmeztetéseket. A számokat átírhatod, a mentés után minden nézet ezekkel számol.
      </p>

      <Section title="Az értékelés">
        <Rule form={form} names={["reviewWindowDays"]}>
          Az értékelés az elmúlt
          <NumberField form={form} name="reviewWindowDays" label="Napok száma" width="narrow" />
          nap fuvarjaiból számol.
        </Rule>
        <Rule form={form} names={["onParTolerancePercent"]}>
          Aki a csapatértéktől legfeljebb
          <NumberField
            form={form}
            name="onParTolerancePercent"
            label="Eltérés százalékban"
            width="narrow"
          />
          százalékkal tér el, az csapatszinten van. Ennél jobb érték erősség, rosszabb fejlesztendő.
        </Rule>
        <Rule form={form} names={["minMedianSample", "minShareSample"]}>
          Az időket legalább
          <NumberField
            form={form}
            name="minMedianSample"
            label="Legkevesebb eset időhöz"
            width="narrow"
          />
          esetből, az arányokat legalább
          <NumberField
            form={form}
            name="minShareSample"
            label="Legkevesebb fuvar arányhoz"
            width="narrow"
          />
          fuvarból számoljuk. Kevesebből nem mondunk értéket, csak azt, hogy kevés az adat.
        </Rule>
      </Section>

      <Section title="Mit mérünk">
        <p className="text-text-secondary">
          Mindegyiknél a kisebb érték a jobb. Az időket mediánnal számoljuk, így egy-egy kiugró
          fuvar nem húzza el.
        </p>
        <MetricDefinition id="idleAfterUnload" />
        <MetricDefinition id="firstResponse" />
        <MetricDefinition id="decision" />
        <MetricDefinition id="unanswered">
          <Rule form={form} names={["unansweredAfterMinutes"]}>
            Egy igény
            <NumberField
              form={form}
              name="unansweredAfterMinutes"
              label="Percek válasz nélkül"
              width="wide"
            />
            perc után számít megválaszolatlannak. A Fuvarok kártyáin ettől pirosodik az első válasz
            órája, és ettől jön a figyelmeztetés.
          </Rule>
        </MetricDefinition>
        <MetricDefinition id="repeatedChanges">
          <Rule form={form} names={["repeatedChangeCount"]}>
            Egy fuvar
            <NumberField
              form={form}
              name="repeatedChangeCount"
              label="Módosítások száma"
              width="narrow"
            />
            módosítástól számít többször módosítottnak.
          </Rule>
        </MetricDefinition>
      </Section>

      <Section title="Pontosság a Fuvarok nézetben">
        <Rule form={form} names={["onTimeToleranceMinutes"]}>
          A felrakás és a lerakás a tervhez képest
          <NumberField
            form={form}
            name="onTimeToleranceMinutes"
            label="Percek késés nélkül"
            width="wide"
          />
          percig számít pontosnak. Ennél nagyobb csúszásnál a kártya pirossal írja ki a késést, a
          tervezett lerakás után pedig figyelmeztetés jön.
        </Rule>
      </Section>

      {conflict ? (
        <ActionableNotification
          inline
          kind="error"
          lowContrast
          hideCloseButton
          title="Közben valaki más is mentett."
          subtitle="A módosításaid nem kerültek be. Töltsd be a mostani értékeket, és írd át újra."
          actionButtonLabel="Mostani értékek betöltése"
          onActionButtonClick={() => router.refresh()}
        />
      ) : null}
      {mutation.isError ? (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="A mentés nem sikerült."
          subtitle="Próbáld újra egy kicsit később."
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-subtle pt-6">
        <Button type="submit" disabled={!isDirty || mutation.isPending || mutation.isSuccess}>
          Mentés
        </Button>
        <Button
          kind="ghost"
          disabled={!isDirty || mutation.isPending}
          onClick={() => form.reset(settings)}
        >
          Visszaállítás
        </Button>
        <p className="text-sm text-text-helper tabular-nums">
          Utoljára mentve:{" "}
          <time dateTime={updatedAt.toISOString()}>{formatDateTime(updatedAt)}</time>
        </p>
      </div>
    </form>
  );
}
