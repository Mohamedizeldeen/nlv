import { Form, Head } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import SiteContentController from '@/actions/App/Http/Controllers/Admin/SiteContentController';
import { CompletenessBadge } from '@/components/admin/arabic-completeness';
import type { CompletenessField } from '@/components/admin/arabic-completeness';
import type { ErrorBag } from '@/components/admin/bilingual';
import { Button } from '@/components/admin/button';
import { Fieldset } from '@/components/admin/field';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/admin/panel';
import { SaveBar } from '@/components/admin/save-bar';
import { Tabs } from '@/components/admin/tabs';
import { useUnsavedGuard } from '@/components/admin/use-unsaved-guard';
import { ViewOnSite } from '@/components/admin/view-on-site';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { home as homeArabic } from '@/routes/ar';
import {
    BilingualSettingInput,
    SettingInput,
    arabicKey,
    isWide,
} from './setting-field';
import type { SettingField, SettingGroup, SiteContentProps } from './types';

/** Page titles per group; other groups accent the last word of their label. */
const TITLES: Record<string, ReactNode> = {
    contact: (
        <>
            How retailers <em>reach you.</em>
        </>
    ),
    social: (
        <>
            Where to <em>follow NLV.</em>
        </>
    ),
    stats: (
        <>
            The numbers <em>on the page.</em>
        </>
    ),
    hero: (
        <>
            The <em>first screen.</em>
        </>
    ),
    sections: (
        <>
            Every section, <em>introduced.</em>
        </>
    ),
    partners: (
        <>
            The partners <em>band.</em>
        </>
    ),
    order: (
        <>
            The order <em>form.</em>
        </>
    ),
    footer: (
        <>
            The <em>last word.</em>
        </>
    ),
    seo: (
        <>
            Search and <em>sharing.</em>
        </>
    ),
};

function titleFor(group: SettingGroup): ReactNode {
    if (TITLES[group.key]) {
        return TITLES[group.key];
    }

    const words = group.label.split(' ');
    const last = words.pop();

    return (
        <>
            {words.length ? `${words.join(' ')} ` : ''}
            <em>{last}.</em>
        </>
    );
}

type Section = {
    /** "How it works" for labels written "How it works: title"; null otherwise. */
    title: string | null;
    anchor: string;
    items: { field: SettingField; label: string }[];
};

/**
 * Consecutive fields whose labels share a "Section: " prefix are grouped
 * under that section (the Section headings tab); the rest form one group.
 */
function sectionsOf(fields: SettingField[]): Section[] {
    const sections: Section[] = [];

    for (const field of fields) {
        const split = field.label.indexOf(': ');
        const title = split > 0 ? field.label.slice(0, split) : null;
        const rest = split > 0 ? field.label.slice(split + 2) : field.label;
        const label = rest.charAt(0).toUpperCase() + rest.slice(1);
        const last = sections.at(-1);

        if (last && last.title === title) {
            last.items.push({ field, label });
        } else {
            sections.push({
                title,
                anchor: `section-${(title ?? 'fields').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                items: [{ field, label }],
            });
        }
    }

    return sections;
}

const asString = (value: SettingField['value']) =>
    value === null ? '' : String(value);

/**
 * The form's values by input name: "hero.title" (English, or the only
 * value of an address, link or figure) and "hero.title_ar" (Arabic).
 */
function valuesOf(fields: SettingField[]): Record<string, string> {
    return Object.fromEntries(
        fields.flatMap((field) => [
            [field.key, asString(field.value)],
            ...(field.translatable
                ? [[arabicKey(field.key), asString(field.value_ar)]]
                : []),
        ]),
    );
}

/** The input names of a field: its key, and "<key>_ar" for copy. */
const namesOf = (field: SettingField) =>
    field.translatable ? [field.key, arabicKey(field.key)] : [field.key];

function GroupForm({
    group,
    fields,
    lastSaved,
}: {
    group: SettingGroup;
    fields: SettingField[];
    lastSaved: SiteContentProps['lastSaved'];
}) {
    const [initial] = useState<Record<string, string>>(() => valuesOf(fields));
    const [values, setValues] = useState(initial);
    const dirty = Object.keys(initial).some(
        (name) => values[name] !== initial[name],
    );
    const guard = useUnsavedGuard(dirty, {
        subject: `the ${group.label} tab`,
    });
    const customised = fields.filter((field) =>
        namesOf(field).some((name) => (values[name] ?? '').trim() !== ''),
    ).length;
    // Copy whose English was changed but not its Arabic: the Arabic page
    // still shows the Arabic default (or the English) there.
    const translations: CompletenessField[] = fields
        .filter((field) => field.translatable)
        .map((field) => ({
            name: field.key,
            label: field.label,
            en: values[field.key] ?? '',
            ar: values[arabicKey(field.key)] ?? '',
        }));
    const sections = sectionsOf(fields);
    const titled = sections.filter((section) => section.title !== null);

    const set = (name: string, value: string) =>
        setValues((current) => ({ ...current, [name]: value }));

    return (
        <>
            <Form
                {...SiteContentController.update.form(group.key)}
                options={{ preserveScroll: true }}
                // The server validates; its messages show under each field.
                noValidate
                className="mt-6 grid items-start gap-5 lg:grid-cols-12"
            >
                {({ errors, processing, hasErrors, clearErrors }) => (
                    <>
                        <div className="grid min-w-0 gap-5 lg:col-span-8">
                            <Panel
                                variant="strong"
                                title={group.label}
                                description={group.help}
                                actions={
                                    <>
                                        <span className="text-[12px] text-smoke tabular-nums">
                                            {customised} of {fields.length}{' '}
                                            changed
                                        </span>
                                        <CompletenessBadge
                                            fields={translations}
                                        />
                                    </>
                                }
                            >
                                <div className="grid gap-8">
                                    {sections.map((section) => {
                                        const inputs = section.items.map(
                                            ({ field, label }) => {
                                                const shared = {
                                                    field,
                                                    label: section.title
                                                        ? label
                                                        : undefined,
                                                    className: cn(
                                                        isWide(field) &&
                                                            'md:col-span-2',
                                                    ),
                                                };

                                                return field.translatable ? (
                                                    <BilingualSettingInput
                                                        key={field.key}
                                                        {...shared}
                                                        value={{
                                                            en:
                                                                values[
                                                                    field.key
                                                                ] ?? '',
                                                            ar:
                                                                values[
                                                                    arabicKey(
                                                                        field.key,
                                                                    )
                                                                ] ?? '',
                                                        }}
                                                        onChange={(value) =>
                                                            setValues(
                                                                (current) => ({
                                                                    ...current,
                                                                    [field.key]:
                                                                        value.en,
                                                                    [arabicKey(
                                                                        field.key,
                                                                    )]:
                                                                        value.ar,
                                                                }),
                                                            )
                                                        }
                                                        errors={
                                                            errors as ErrorBag
                                                        }
                                                    />
                                                ) : (
                                                    <SettingInput
                                                        key={field.key}
                                                        {...shared}
                                                        value={
                                                            values[field.key] ??
                                                            ''
                                                        }
                                                        onChange={(value) =>
                                                            set(
                                                                field.key,
                                                                value,
                                                            )
                                                        }
                                                        error={
                                                            (
                                                                errors as ErrorBag
                                                            )[field.key]
                                                        }
                                                    />
                                                );
                                            },
                                        );

                                        return (
                                            <div
                                                key={section.anchor}
                                                id={section.anchor}
                                                className="scroll-mt-24 border-t border-white/10 pt-7 first:border-t-0 first:pt-0"
                                            >
                                                {section.title ? (
                                                    <Fieldset
                                                        legend={section.title}
                                                        className="gap-x-5 gap-y-6 md:grid-cols-2"
                                                    >
                                                        {inputs}
                                                    </Fieldset>
                                                ) : (
                                                    <div className="grid gap-x-5 gap-y-6 md:grid-cols-2">
                                                        {inputs}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </Panel>

                            <SaveBar
                                dirty={dirty}
                                processing={processing}
                                hasErrors={hasErrors}
                                savedAt={lastSaved?.at}
                                savedBy={lastSaved?.user}
                                onDiscard={() => {
                                    setValues(initial);
                                    clearErrors();
                                }}
                            />
                        </div>

                        <aside className="grid min-w-0 content-start gap-5 lg:sticky lg:top-6 lg:col-span-4">
                            <Panel
                                kicker="How it works"
                                title="Every field has a default"
                            >
                                <div className="grid gap-4 text-[13.5px] leading-relaxed text-pretty text-mist">
                                    <p>
                                        The grey text in an empty field is what
                                        the page shows now. Type over it to
                                        change it; empty the field, or use{' '}
                                        <span className="text-bone">
                                            Reset to default
                                        </span>
                                        , to bring the original back.
                                    </p>
                                    <p>
                                        Words are written twice, in English and
                                        in Arabic, and each language keeps or
                                        resets its own. Addresses, links and
                                        figures are shared by both pages.
                                    </p>
                                    <p className="text-smoke">
                                        Changes go live when you save, and each
                                        save is kept in the activity log.
                                    </p>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <ViewOnSite href={home.url()} />
                                        <ViewOnSite href={homeArabic.url()}>
                                            View in Arabic
                                        </ViewOnSite>
                                        <Button
                                            variant="ghost"
                                            disabled={customised === 0}
                                            onClick={() =>
                                                setValues(
                                                    Object.fromEntries(
                                                        Object.keys(
                                                            initial,
                                                        ).map((name) => [
                                                            name,
                                                            '',
                                                        ]),
                                                    ),
                                                )
                                            }
                                        >
                                            Use every default
                                        </Button>
                                    </div>
                                </div>
                            </Panel>

                            {titled.length > 1 ? (
                                <Panel
                                    kicker="On this tab"
                                    padded={false}
                                    className="max-lg:hidden"
                                >
                                    <nav aria-label="Sections on this tab">
                                        <ol className="divide-y divide-white/[0.07]">
                                            {titled.map((section, index) => (
                                                <li key={section.anchor}>
                                                    <a
                                                        href={`#${section.anchor}`}
                                                        className="flex items-baseline gap-3 px-5 py-2.5 text-[14px] text-mist transition-colors duration-300 ease-glass hover:bg-white/[0.035] hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none focus-visible:ring-inset sm:px-6"
                                                    >
                                                        <span className="w-5 text-[11px] text-smoke tabular-nums">
                                                            {String(
                                                                index + 1,
                                                            ).padStart(2, '0')}
                                                        </span>
                                                        {section.title}
                                                    </a>
                                                </li>
                                            ))}
                                        </ol>
                                    </nav>
                                </Panel>
                            ) : null}
                        </aside>
                    </>
                )}
            </Form>
            {guard}
        </>
    );
}

export default function SiteContent({
    group,
    groups,
    fields,
    lastSaved,
}: SiteContentProps) {
    const current = groups.find((item) => item.key === group) ?? groups[0];
    const tabs = useRef<HTMLDivElement>(null);
    // A save that changes values remounts the form from the saved values.
    const formKey = `${group}:${Object.values(valuesOf(fields)).join('␟')}`;

    // On phones the tab row scrolls: bring the open tab into view.
    useEffect(() => {
        tabs.current
            ?.querySelector('[aria-current="page"]')
            ?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }, [group]);

    return (
        <>
            <Head title={`${current.label} · Site content · Admin`} />
            <PageHeader
                crumbs={[{ label: current.label }]}
                title={titleFor(current)}
                description="The landing page’s words, numbers and contact details. Each tab saves on its own."
            />
            <div ref={tabs}>
                <Tabs
                    className="mt-8"
                    label="Content groups"
                    value={group}
                    items={groups.map((item) => ({
                        value: item.key,
                        label: item.label,
                        href: SiteContentController.edit.url({
                            query: { group: item.key },
                        }),
                    }))}
                />
            </div>
            <GroupForm
                key={formKey}
                group={current}
                fields={fields}
                lastSaved={lastSaved}
            />
        </>
    );
}
