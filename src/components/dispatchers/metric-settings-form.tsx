"use client";

import { Analytics } from "@carbon/icons-react";
import { ActionableNotification, Button, InlineNotification, SkeletonText } from "@carbon/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { useForm, useFormState, useWatch, type UseFormReturn } from "react-hook-form";
import { saveMetricSettings } from "@/actions/metric-settings";
import { previewPerformanceReview } from "@/actions/performance";
import { PreviewLegend, ReviewPreview } from "@/components/dispatchers/review-preview";
import { formatDateTime, formatShare } from "@/lib/format";
import {
  reviewMetricText,
  summarizeReview,
  type ReviewMetricId,
  type ReviewSummary,
} from "@/lib/performance/review";
import { metricSettingsSchema, type MetricSettings } from "@/lib/performance/settings";
import { queryKeys } from "@/lib/query-keys";

type Form = UseFormReturn<MetricSettings>;

/** How long the numbers must stay still before the preview is recomputed. */
const previewDelayMs = 350;

/**
 * The draft once it has stopped changing for `previewDelayMs`. An invalid draft (`null`) keeps
 * the last valid one, so the preview never goes blank while a number is being retyped.
 */
function useSettledSettings(draft: MetricSettings | null, initial: MetricSettings) {
  const [settled, setSettled] = useState(initial);
  const draftKey = draft === null ? null : JSON.stringify(draft);

  useEffect(() => {
    if (draftKey === null) return;
    const timer = setTimeout(
      () => setSettled(metricSettingsSchema.parse(JSON.parse(draftKey))),
      previewDelayMs,
    );
    return () => clearTimeout(timer);
  }, [draftKey]);

  return { settled, settling: draftKey !== null && draftKey !== JSON.stringify(settled) };
}

function previewQuery(settings: MetricSettings) {
  return {
    queryKey: queryKeys.performance.preview(settings),
    queryFn: () => previewPerformanceReview(settings),
  };
}

/** A number typed into the sentence it belongs to; the sentence is its label. */
function NumberField({
  form,
  name,
  label,
  width,
  changed,
}: {
  form: Form;
  name: keyof MetricSettings;
  label: string;
  width: "narrow" | "wide";
  /** Differs from the stored value. */
  changed: boolean;
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
      data-changed={changed ? "" : undefined}
      className={`${width === "narrow" ? "w-14" : "w-[4.5rem]"} mx-1 inline-block h-8 scroll-mb-24 [appearance:textfield] rounded-lg border border-border-strong bg-layer px-2 text-right font-semibold tabular-nums transition-colors hover:border-onyx-500 focus-visible:border-focus focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus aria-invalid:border-attention aria-invalid:bg-attention-tint aria-invalid:text-attention-ink data-changed:border-sunflower-gold-600 data-changed:bg-sunflower-gold-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      {...form.register(name, { valueAsNumber: true })}
    />
  );
}

/**
 * What a rule does to the review: a label and its figures, each with an optional noun
 * ("11 erősség"). Recomputed as the numbers change.
 */
type Impact = {
  label: string;
  figures: (summary: ReviewSummary) => { value: string; noun: string | null }[];
};

/** The figures with the draft numbers; a figure that differs from now shows the old one struck. */
function ImpactLine({
  impact,
  draft,
  current,
  settling,
}: {
  impact: Impact;
  draft: ReviewSummary | undefined;
  current: ReviewSummary | undefined;
  settling: boolean;
}) {
  if (draft === undefined || current === undefined) {
    return <SkeletonText width="60%" className="mb-0!" />;
  }
  const before = impact.figures(current);

  return (
    <p
      aria-live="polite"
      aria-busy={settling}
      className="flex items-start gap-2 text-sm text-text-secondary transition-opacity aria-busy:opacity-50"
    >
      <Analytics size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-sunflower-gold-700" />
      <span>
        {impact.label}:{" "}
        {impact.figures(draft).map((figure, index) => {
          const was = before[index].value;
          return (
            <span key={index}>
              {index > 0 ? ", " : null}
              {was === figure.value ? null : (
                <>
                  <del className="text-text-helper">
                    <span className="sr-only">eddig </span>
                    {was}
                  </del>{" "}
                </>
              )}
              <strong className="font-semibold text-text-primary tabular-nums">
                {figure.value}
              </strong>
              {figure.noun === null ? null : ` ${figure.noun}`}
            </span>
          );
        })}
      </span>
    </p>
  );
}

/** A rule as a sentence with its numbers in it, the errors under it, then what it does. */
function Rule({
  form,
  names,
  impact,
  children,
}: {
  form: Form;
  names: (keyof MetricSettings)[];
  impact: ReactNode;
  children: ReactNode;
}) {
  const { errors: fieldErrors } = useFormState({ control: form.control, name: names });
  const errors = names.flatMap((name) => {
    const message = fieldErrors[name]?.message;
    return message === undefined ? [] : [{ name, message }];
  });

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-layer-sunken px-4 py-3">
      <p className="leading-9">{children}</p>
      {errors.map(({ name, message }) => (
        <p key={name} id={`${name}-error`} className="text-sm font-medium text-attention-ink">
          {message}
        </p>
      ))}
      {impact}
    </div>
  );
}

function Panel({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-layer p-5 md:p-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg/7 font-semibold">{title}</h2>
        <p className="text-sm text-text-secondary">{intro}</p>
      </header>
      {children}
    </section>
  );
}

/** What a metric measures, and the rule it uses when it has one. */
function MetricDefinition({ id, children }: { id: ReviewMetricId; children?: ReactNode }) {
  const text = reviewMetricText[id];

  return (
    <div className="flex flex-col gap-3 border-t border-border-subtle pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">{text.label}</h3>
        <p className="max-w-[68ch] text-sm text-text-secondary">{text.definition}</p>
      </div>
      {children}
    </div>
  );
}

const figure = (value: number | string, noun: string | null = null) => ({
  value: String(value),
  noun,
});

const impacts = {
  window: {
    label: "Az időszakba esik",
    figures: (s) => [figure(s.shipmentsInWindow, "fuvar")],
  },
  onPar: {
    label: "Ezzel kijön",
    figures: (s) => [
      figure(s.verdicts.strength, "erősség"),
      figure(s.verdicts.on_par, "csapatszint"),
      figure(s.verdicts.needs_work, "fejlesztendő"),
    ],
  },
  samples: {
    label: "Kevés adat miatt üres",
    figures: (s) => [figure(s.insufficient, "mutató")],
  },
  unanswered: {
    label: "Most megválaszolatlan",
    figures: (s) => [figure(s.unanswered, "igény")],
  },
  repeatedChanges: {
    label: "Többször módosított",
    figures: (s) => [
      s.repeatedChangeShare === null
        ? figure("kevés adat")
        : figure(formatShare(s.repeatedChangeShare), "a fuvarokból"),
    ],
  },
} as const satisfies Record<string, Impact>;

/**
 * How the review, the alerts and the shipment cards measure, with the thresholds editable in
 * place and their effect on the review previewed as they change. A save names the version it
 * started from, so it cannot overwrite a newer one.
 */
export function MetricSettingsForm({
  settings,
  updatedAt,
  onSaved,
}: {
  settings: MetricSettings;
  updatedAt: Date;
  onSaved: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<MetricSettings>({
    resolver: zodResolver(metricSettingsSchema),
    defaultValues: settings,
  });

  const values = useWatch({ control: form.control });
  const draft = metricSettingsSchema.safeParse(values);
  const { settled, settling } = useSettledSettings(draft.success ? draft.data : null, settings);
  const current = useQuery(previewQuery(settings));
  const preview = useQuery({ ...previewQuery(settled), placeholderData: keepPreviousData });
  const previewBusy = settling || preview.isPlaceholderData;
  const summaries = {
    draft: preview.data === undefined ? undefined : summarizeReview(preview.data),
    current: current.data === undefined ? undefined : summarizeReview(current.data),
  };
  const impactOf = (impact: Impact) => (
    <ImpactLine
      impact={impact}
      draft={summaries.draft}
      current={summaries.current}
      settling={previewBusy}
    />
  );

  const mutation = useMutation({
    mutationFn: (values: MetricSettings) =>
      saveMetricSettings({ settings: values, expectedUpdatedAt: updatedAt }),
    onSuccess: async (result) => {
      if (result.status === "conflict") return;
      // The alerts on the Fuvarok screens and the review were computed with the old thresholds.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.shipments.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.performance.all }),
      ]);
      onSaved();
      router.refresh();
    },
  });

  const conflict = mutation.data?.status === "conflict";
  // Compared with the stored values, so typing a number back counts as no change.
  const changed = (name: keyof MetricSettings) => values[name] !== settings[name];
  const changedCount = metricSettingsSchema.keyof().options.filter(changed).length;
  const isDirty = changedCount > 0;
  const save = form.handleSubmit((values) => mutation.mutate(values));

  // Leaving with unsaved numbers asks first.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  function saveOnShortcut(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "s" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (isDirty && !mutation.isPending) void save();
    }
  }

  return (
    <form
      noValidate
      onSubmit={save}
      onKeyDown={saveOnShortcut}
      className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_23rem]"
    >
      <aside
        aria-labelledby="preview-title"
        className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-layer p-5 lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1"
      >
        <header className="flex flex-col gap-1">
          <h2 id="preview-title" className="text-lg/7 font-semibold">
            Előnézet
          </h2>
          <p className="text-sm text-text-secondary">
            Így értékel az oldal ezekkel a számokkal. Mutatónként egy pont, a változók bekarikázva.
          </p>
        </header>
        {preview.data === undefined || current.data === undefined ? (
          <SkeletonText paragraph lineCount={5} />
        ) : (
          <ReviewPreview draft={preview.data} current={current.data} settling={previewBusy} />
        )}
        <PreviewLegend />
      </aside>

      <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1">
        <Panel
          title="Az értékelés"
          intro="Melyik időszakból számolunk, és mikor erősség vagy fejlesztendő egy érték."
        >
          <Rule form={form} names={["reviewWindowDays"]} impact={impactOf(impacts.window)}>
            Az értékelés az elmúlt
            <NumberField
              form={form}
              name="reviewWindowDays"
              changed={changed("reviewWindowDays")}
              label="Napok száma"
              width="narrow"
            />
            nap fuvarjaiból számol.
          </Rule>
          <Rule form={form} names={["onParTolerancePercent"]} impact={impactOf(impacts.onPar)}>
            Aki a csapatértéktől legfeljebb
            <NumberField
              form={form}
              name="onParTolerancePercent"
              changed={changed("onParTolerancePercent")}
              label="Eltérés százalékban"
              width="narrow"
            />
            százalékkal tér el, az csapatszinten van. Ennél jobb érték erősség, rosszabb
            fejlesztendő.
          </Rule>
          <Rule
            form={form}
            names={["minMedianSample", "minShareSample"]}
            impact={impactOf(impacts.samples)}
          >
            Az időket legalább
            <NumberField
              form={form}
              name="minMedianSample"
              changed={changed("minMedianSample")}
              label="Legkevesebb eset időhöz"
              width="narrow"
            />
            esetből, az arányokat legalább
            <NumberField
              form={form}
              name="minShareSample"
              changed={changed("minShareSample")}
              label="Legkevesebb fuvar arányhoz"
              width="narrow"
            />
            fuvarból számoljuk. Kevesebből nem mondunk értéket.
          </Rule>
        </Panel>

        <Panel
          title="Mit mérünk"
          intro="Mindegyiknél a kisebb érték a jobb. Az időket mediánnal számoljuk, így egy-egy kiugró fuvar nem húzza el."
        >
          <MetricDefinition id="idleAfterUnload" />
          <MetricDefinition id="firstResponse" />
          <MetricDefinition id="decision" />
          <MetricDefinition id="unanswered">
            <Rule
              form={form}
              names={["unansweredAfterMinutes"]}
              impact={impactOf(impacts.unanswered)}
            >
              Egy igény
              <NumberField
                form={form}
                name="unansweredAfterMinutes"
                changed={changed("unansweredAfterMinutes")}
                label="Percek válasz nélkül"
                width="wide"
              />
              perc után számít megválaszolatlannak. A Fuvarok kártyáin ettől pirosodik az első
              válasz órája, és ettől jön a figyelmeztetés.
            </Rule>
          </MetricDefinition>
          <MetricDefinition id="repeatedChanges">
            <Rule
              form={form}
              names={["repeatedChangeCount"]}
              impact={impactOf(impacts.repeatedChanges)}
            >
              Egy fuvar
              <NumberField
                form={form}
                name="repeatedChangeCount"
                changed={changed("repeatedChangeCount")}
                label="Módosítások száma"
                width="narrow"
              />
              módosítástól számít többször módosítottnak.
            </Rule>
          </MetricDefinition>
        </Panel>

        <Panel
          title="Pontosság"
          intro="A Fuvarok kártyái ezzel mérik a felrakást és a lerakást a tervhez. Az értékelést nem érinti."
        >
          <Rule form={form} names={["onTimeToleranceMinutes"]} impact={null}>
            A felrakás és a lerakás a tervhez képest
            <NumberField
              form={form}
              name="onTimeToleranceMinutes"
              changed={changed("onTimeToleranceMinutes")}
              label="Percek késés nélkül"
              width="wide"
            />
            percig számít pontosnak. Ennél nagyobb csúszásnál a kártya pirossal írja ki a késést, a
            tervezett lerakás után pedig figyelmeztetés jön.
          </Rule>
        </Panel>

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

        {isDirty ? (
          <div className="sticky bottom-4 z-10 flex animate-rise items-center justify-between gap-3 rounded-xl bg-onyx-900 py-2 pr-2 pl-4 text-white shadow-[0_12px_32px_rgb(19_18_16/0.28)]">
            <p className="min-w-0 text-sm font-medium">{changedCount} módosítás nincs mentve</p>
            <div className="flex gap-2">
              <Button
                kind="ghost"
                size="md"
                className="text-white! hover:bg-onyx-800!"
                disabled={mutation.isPending}
                onClick={() => form.reset(settings)}
              >
                Elvetés
              </Button>
              <Button
                type="submit"
                size="md"
                title="Ctrl+S"
                disabled={mutation.isPending || mutation.isSuccess}
              >
                Mentés
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-helper tabular-nums">
            Utoljára mentve:{" "}
            <time dateTime={updatedAt.toISOString()}>{formatDateTime(updatedAt)}</time>
          </p>
        )}
      </div>
    </form>
  );
}
