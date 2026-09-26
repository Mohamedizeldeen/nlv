import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { useSyncExternalStore } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { directionOf, otherLocale } from '@/i18n';
import { cn } from '@/lib/utils';

/*
 * The language control: one quiet text link naming the OTHER language in its
 * own script ("العربية" on the English page, "English" on the Arabic one),
 * no pill, no flag. It is a real link to the same page in that language
 * (the shared `alternates` prop), carrying the current #section along, so
 * nothing has to be remembered: the URL is the language. A full page load
 * on purpose, since the server renders <html lang dir> for the language.
 */

const languageSwitch = cva(
    'transition-[color,text-decoration-color] duration-[380ms] ease-glass focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none',
    {
        variants: {
            variant: {
                /** Among the capsule's section links (desktop navbar). */
                navbar: 'rounded-[12px] px-3 py-2 text-sm text-mist hover:text-bone xl:px-3.5',
                /** A full-height touch row in the phone menu. */
                menu: '-mx-2 inline-flex min-h-11 items-center rounded-[12px] px-2 text-[15px] text-bone hover:text-mint',
                /**
                 * The footer's bottom line, beside the fine print. One Latin
                 * line tall, so the taller Arabic face doesn't grow the row.
                 */
                footer: 'inline-flex h-[1lh] items-center rounded-[6px] text-[13px] text-mist underline decoration-transparent decoration-1 underline-offset-[6px] hover:text-bone hover:decoration-mint/60 focus-visible:ring-offset-4 focus-visible:ring-offset-ink',
            },
        },
        defaultVariants: { variant: 'navbar' },
    },
);

type LanguageSwitchProps = VariantProps<typeof languageSwitch> & {
    className?: string;
};

function subscribeToHash(onChange: () => void) {
    window.addEventListener('hashchange', onChange);

    return () => window.removeEventListener('hashchange', onChange);
}

const currentHash = () => window.location.hash;
const hashOnServer = () => '';

export function LanguageSwitch({ variant, className }: LanguageSwitchProps) {
    const { locale, alternates, t } = useI18n();
    // The section being read travels along ("/#pricing" → "/ar#pricing").
    const hash = useSyncExternalStore(
        subscribeToHash,
        currentHash,
        hashOnServer,
    );
    const target = otherLocale(locale);
    const url = alternates?.[target];

    if (!url) {
        return null;
    }

    return (
        <a
            href={hash && !url.includes('#') ? url + hash : url}
            hrefLang={target}
            aria-label={t('common.switchLanguage')}
            className={cn(languageSwitch({ variant }), className)}
        >
            {/* The accessible name is in the page's language (aria-label);
                the visible name is in its own, which also gives it that
                script's typography (:lang rules in landing.css). Arabic
                reads small beside Latin at the same size: a step up. */}
            <span
                lang={target}
                dir={directionOf(target)}
                className={target === 'ar' ? 'text-[1.08em]' : undefined}
            >
                {t('common.otherLanguage')}
            </span>
        </a>
    );
}
