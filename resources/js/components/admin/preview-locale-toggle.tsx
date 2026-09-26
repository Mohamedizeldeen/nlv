import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { CONTENT_LOCALES, LOCALE_META } from './bilingual';
import type { ContentLocale } from './bilingual';

/**
 * EN | AR for a live preview: which language the card is shown in. Wrap
 * the preview in `localeProps(locale)` (lang + dir) and read its copy
 * with `localized(value, locale)`, which falls back to English like the
 * site does. A radio group: ←/→ switch, one Tab stop.
 *
 * <Panel title="Preview" actions={<PreviewLocaleToggle value={locale} onValueChange={setLocale} />}>
 *     <div {...localeProps(locale)}><StoryCard … /></div>
 * </Panel>
 */
export function PreviewLocaleToggle({
    value,
    onValueChange,
    label = 'Preview language',
    className,
}: {
    value: ContentLocale;
    onValueChange: (locale: ContentLocale) => void;
    /** Accessible name of the group. */
    label?: string;
    className?: string;
}) {
    const group = useRef<HTMLDivElement>(null);

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (
            !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
                event.key,
            )
        ) {
            return;
        }

        event.preventDefault();
        const next = value === 'en' ? 'ar' : 'en';
        onValueChange(next);
        group.current
            ?.querySelector<HTMLButtonElement>(`[data-locale="${next}"]`)
            ?.focus();
    };

    return (
        <div
            ref={group}
            role="radiogroup"
            aria-label={label}
            onKeyDown={onKeyDown}
            className={cn(
                'inline-flex h-8 shrink-0 items-center gap-0.5 rounded-[10px] bg-white/[0.04] p-[3px] ring-1 ring-white/[0.12] ring-inset',
                className,
            )}
        >
            {CONTENT_LOCALES.map((locale) => {
                const active = locale === value;

                return (
                    <button
                        key={locale}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        tabIndex={active ? 0 : -1}
                        data-locale={locale}
                        title={LOCALE_META[locale].name}
                        onClick={() => onValueChange(locale)}
                        className={cn(
                            'grid h-full min-w-9 cursor-pointer place-items-center rounded-[7px] px-2 text-[10.5px] leading-none font-medium tracking-[0.18em] transition-[background-color,color,box-shadow] duration-300 ease-glass focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none',
                            active
                                ? 'bg-white/[0.12] text-bone shadow-[inset_0_1px_0_oklch(1_0_0/0.14)]'
                                : 'text-smoke hover:text-bone',
                        )}
                    >
                        {LOCALE_META[locale].marker}
                        <span className="sr-only">
                            {' '}
                            {LOCALE_META[locale].name}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
