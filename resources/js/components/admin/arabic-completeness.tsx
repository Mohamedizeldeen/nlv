import { ArrowDownRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { arabicName, isBlank, REVEAL_EVENT } from './bilingual';

type Text = string | readonly (string | null)[] | null | undefined;

/** One translatable field of a form, as the completeness check sees it. */
export type CompletenessField = {
    /** The English column (the bilingual field's `name`, e.g. `title`). */
    name: string;
    /** How the admin knows it: "Title", "Features". */
    label: string;
    en: Text;
    ar: Text;
    /** The Arabic column when it isn't `${name}_ar`. */
    nameAr?: string;
};

/** The position of the first item filled in English but not in Arabic. */
function firstGap(field: CompletenessField): number {
    if (typeof field.en === 'string' || typeof field.ar === 'string') {
        return !isBlank(field.en) && isBlank(field.ar) ? 0 : -1;
    }

    const en = field.en ?? [];
    const ar = field.ar ?? [];

    return en.findIndex((item, index) => !isBlank(item) && isBlank(ar[index]));
}

/**
 * Arabic is missing where the English has text and the Arabic has none
 * (for lists: any row). Visitors on /ar then see the English instead.
 */
export function isArabicMissing(field: CompletenessField): boolean {
    return firstGap(field) !== -1;
}

type Control = HTMLInputElement | HTMLTextAreaElement;

/**
 * Brings a field's Arabic control into view and focuses it (for a list,
 * the first row still to translate). Bilingual kit controls are found by
 * their `data-bilingual-ar` cell; others by name (`title_ar`,
 * `features_ar[]`). Components that hide the control (the Markdown
 * field's tabs) get REVEAL_EVENT first.
 */
export function focusArabic(field: CompletenessField): boolean {
    const nameAr = field.nameAr ?? arabicName(field.name);
    const cells = document.querySelectorAll<HTMLElement>(
        `[data-bilingual-ar="${CSS.escape(field.name)}"]`,
    );
    let controls: Control[] = [...cells]
        .map((cell) =>
            cell.querySelector<Control>('textarea, input:not([type="hidden"])'),
        )
        .filter((control): control is Control => control !== null);

    if (controls.length === 0) {
        controls = [
            ...document.getElementsByName(nameAr),
            ...document.getElementsByName(`${nameAr}[]`),
        ].filter(
            (node): node is Control =>
                node instanceof HTMLTextAreaElement ||
                (node instanceof HTMLInputElement && node.type !== 'hidden'),
        );
    }

    const gap = firstGap(field);
    const target =
        controls[gap] ??
        controls.find((control) => isBlank(control.value)) ??
        controls[0];

    if (!target) {
        return false;
    }

    target.dispatchEvent(new CustomEvent(REVEAL_EVENT, { bubbles: true }));

    requestAnimationFrame(() => {
        const still = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;

        target.scrollIntoView({
            block: 'center',
            behavior: still ? 'auto' : 'smooth',
        });
        target.focus({ preventScroll: true });
    });

    return true;
}

export type ArabicCompleteness = {
    /** Fields filled in English but not in Arabic, in form order. */
    missing: CompletenessField[];
    /** Fields with English text (the ones that need an Arabic version). */
    total: number;
    /** Every field with English text has its Arabic. */
    complete: boolean;
    /** "Arabic missing in 2 fields" / "Arabic complete" / "" (nothing written yet). */
    summary: string;
    /** Focuses the first missing Arabic control (false when there is none). */
    jumpToFirstMissing: () => boolean;
};

/**
 * How much of a form is translated. Pass every translatable field, in
 * form order, with its current values (from the form's state):
 *
 * const arabic = useArabicCompleteness([
 *     { name: 'question', label: 'Question', en: values.question, ar: values.question_ar },
 *     { name: 'answer', label: 'Answer', en: values.answer, ar: values.answer_ar },
 * ]);
 */
export function useArabicCompleteness(
    fields: readonly CompletenessField[],
): ArabicCompleteness {
    const missing = fields.filter(isArabicMissing);
    const total = fields.filter((field) => !isBlank(field.en)).length;
    const complete = total > 0 && missing.length === 0;
    const summary =
        total === 0
            ? ''
            : complete
              ? 'Arabic complete'
              : `Arabic missing in ${missing.length} ${missing.length === 1 ? 'field' : 'fields'}`;

    return {
        missing,
        total,
        complete,
        summary,
        jumpToFirstMissing: () =>
            missing.length > 0 ? focusArabic(missing[0]) : false,
    };
}

/**
 * The form's translation state, in one line: "Arabic missing in 2
 * fields" (a button that jumps to the first one) or "Arabic complete".
 * Renders nothing until some English is written. Put it in the first
 * panel's `actions`, or pass `completeness` from your own
 * `useArabicCompleteness` call to share it.
 */
export function CompletenessBadge({
    fields,
    completeness,
    className,
}: {
    fields?: readonly CompletenessField[];
    completeness?: ArabicCompleteness;
    className?: string;
}) {
    const own = useArabicCompleteness(fields ?? []);
    const state = completeness ?? own;
    const frame =
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-[12.5px] leading-none whitespace-nowrap ring-1 ring-inset [&_svg]:size-3.5';

    if (state.total === 0) {
        return null;
    }

    if (state.complete) {
        return (
            <span
                className={cn(
                    frame,
                    'bg-mint/[0.08] text-mint ring-mint/30',
                    className,
                )}
            >
                <Check aria-hidden />
                {state.summary}
            </span>
        );
    }

    const labels = state.missing.map((field) => field.label).join(', ');

    return (
        <button
            type="button"
            onClick={() => state.jumpToFirstMissing()}
            title={`Missing in Arabic: ${labels}`}
            className={cn(
                frame,
                'cursor-pointer bg-lagoon/[0.1] text-[oklch(0.8_0.09_195)] ring-lagoon/40 transition-colors duration-300 ease-glass hover:bg-lagoon/[0.18] focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none',
                className,
            )}
        >
            {state.summary}
            <span className="sr-only">
                {` (${labels}). Go to the first one.`}
            </span>
            <ArrowDownRight aria-hidden />
        </button>
    );
}
