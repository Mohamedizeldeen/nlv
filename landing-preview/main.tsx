// TEMPORARY dev-only harness: http://localhost:5173/landing-preview/index.html?s=hero,pricing
// Add &lang=ar for the Arabic page (right-to-left, Arabic fixture, Arabic static strings),
// and &untranslated for the Arabic page before the admin fills in the records' Arabic.
import { Component, StrictMode, Suspense, lazy } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../resources/css/app.css';
import { LandingDataProvider } from '@/components/landing/landing-data';
import { OrderDialogProvider } from '@/components/landing/order-dialog';
import { Atmosphere } from '@/components/landing/primitives';
import { directionOf } from '@/i18n';
import type { Alternates, Locale } from '@/i18n';
import { LocaleProvider } from '@/i18n/locale-provider';
import type { LandingData } from '@/types/landing';

/*
 * The seeded `landing` payload per language: fixture.json (English) and
 * fixture.ar.json (Arabic). Regenerate after content changes (tinker squashes
 * the indentation, so the formatter restores it):
 * php artisan tinker --execute 'echo json_encode(App\Support\LandingContent::build("en"), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);' > landing-preview/fixture.json
 * php artisan tinker --execute 'echo json_encode(App\Support\LandingContent::build("ar"), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);' > landing-preview/fixture.ar.json
 * npx vp fmt landing-preview/fixture.json landing-preview/fixture.ar.json
 * Without fixture.ar.json, ?lang=ar lays the English fixture out right to left.
 */
const fixtures = import.meta.glob<unknown>('./fixture*.json', {
    eager: true,
    import: 'default',
});

const params = new URLSearchParams(location.search);
const locale: Locale = params.get('lang') === 'ar' ? 'ar' : 'en';
const english = fixtures['./fixture.json'] as LandingData;
const translated = (fixtures[`./fixture.${locale}.json`] ??
    english) as LandingData;

/*
 * &untranslated: the Arabic page when no record has its Arabic filled in.
 * The server then sends each record's English (stories, looks, categories,
 * plans, questions, page titles), while the copy settings keep their
 * Arabic defaults and coordinates their Arabic compass points.
 */
function untranslated(arabic: LandingData): LandingData {
    return {
        ...arabic,
        stories: english.stories.map((story, index) => ({
            ...story,
            coordinates:
                arabic.stories[index]?.coordinates ?? story.coordinates,
        })),
        lookbook: english.lookbook,
        pricing: {
            ...arabic.pricing,
            plans: english.pricing.plans,
            faqs: english.pricing.faqs,
        },
        pages: english.pages.map((page) => ({
            ...page,
            url: `/ar${page.url}`,
        })),
    };
}

const landing =
    locale === 'ar' && params.has('untranslated')
        ? untranslated(translated)
        : translated;

// What the server renders on the real pages: <html lang="ar" dir="rtl">.
document.documentElement.lang = locale;
document.documentElement.dir = directionOf(locale);

/** This harness URL in another language (the language switch's target). */
function harnessUrl(target: Locale): string {
    const next = new URLSearchParams(location.search);

    if (target === 'en') {
        next.delete('lang');
    } else {
        next.set('lang', target);
    }

    return `${location.pathname}?${next.toString()}`;
}

const alternates: Alternates = { en: harnessUrl('en'), ar: harnessUrl('ar') };

// Sections, plus dev-only specimens of smaller components (?s=language-switch).
const modules = {
    ...import.meta.glob<{ default: ComponentType }>(
        '../resources/js/components/landing/sections/*.tsx',
    ),
    ...import.meta.glob<{ default: ComponentType }>('./specimens/*.tsx'),
};
const names = (params.get('s') ?? '').split(',').filter(Boolean);
const sections = names.map((name) => {
    const loader =
        modules[`../resources/js/components/landing/sections/${name}.tsx`] ??
        modules[`./specimens/${name}.tsx`];

    return { name, Section: loader ? lazy(loader) : null };
});

class Boundary extends Component<
    { name: string; children: ReactNode },
    { error: Error | null }
> {
    state = { error: null as Error | null };

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    render() {
        if (this.state.error) {
            return (
                <pre
                    data-preview-error
                    style={{
                        color: '#f88',
                        padding: 24,
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    {this.props.name}: {String(this.state.error.stack)}
                </pre>
            );
        }

        return this.props.children;
    }
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <LocaleProvider locale={locale} alternates={alternates}>
            <LandingDataProvider value={landing}>
                <OrderDialogProvider>
                    <div className="landing relative isolate min-h-screen overflow-x-clip bg-ink font-sans text-bone antialiased">
                        <Atmosphere />
                        {sections.map(({ name, Section }) => (
                            <Boundary key={name} name={name}>
                                <Suspense fallback={null}>
                                    {Section ? (
                                        <Section />
                                    ) : (
                                        <p>Unknown section: {name}</p>
                                    )}
                                </Suspense>
                            </Boundary>
                        ))}
                    </div>
                </OrderDialogProvider>
            </LandingDataProvider>
        </LocaleProvider>
    </StrictMode>,
);
