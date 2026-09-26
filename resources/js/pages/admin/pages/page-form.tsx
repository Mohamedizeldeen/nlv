import { Form } from '@inertiajs/react';
import { useState } from 'react';
import PageController from '@/actions/App/Http/Controllers/Admin/PageController';
import { CompletenessBadge } from '@/components/admin/arabic-completeness';
import { bilingualValue } from '@/components/admin/bilingual';
import type { BilingualValue } from '@/components/admin/bilingual';
import {
    BilingualField,
    BilingualTextarea,
} from '@/components/admin/bilingual-field';
import { BilingualMarkdownField } from '@/components/admin/bilingual-markdown-field';
import { Field, FieldError } from '@/components/admin/field';
import { Panel } from '@/components/admin/panel';
import { SaveBar } from '@/components/admin/save-bar';
import { Select } from '@/components/admin/select';
import { TextInput } from '@/components/admin/text-input';
import { Toggle } from '@/components/admin/toggle';
import { useUnsavedGuard } from '@/components/admin/use-unsaved-guard';
import { show as showArabic } from '@/routes/ar/pages';
import { show } from '@/routes/pages';
import type { FooterGroup, PageFormProps } from './types';

type Values = {
    title: BilingualValue;
    slug: string;
    summary: BilingualValue;
    body: BilingualValue;
    footer_group: FooterGroup | '';
    is_published: boolean;
};

/** The fields written in both languages. */
const BILINGUAL = ['title', 'summary', 'body'] as const;

/** "About us!" → "about-us" (the server normalises the same way). */
export function slugify(text: string): string {
    return text
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120)
        .replace(/-+$/, '');
}

/** Where a page is served in each language, in one line. */
function addresses(slug: string): string {
    const address = slug || '…';

    return `/pages/${address} and /ar/pages/${address}`;
}

/**
 * The page form, shared by create and edit: the title and summary in
 * English and Arabic with the address and footer column, then the
 * Markdown of each language with its live preview, then a sticky save
 * bar. Remount it (with a `key`) after a save so it starts again from
 * the saved page.
 */
export function PageForm({ page, html, htmlAr, footerGroups }: PageFormProps) {
    const creating = page.id === null;
    const [initial] = useState<Values>(() => ({
        title: bilingualValue(page, 'title'),
        slug: page.slug,
        summary: bilingualValue(page, 'summary'),
        body: bilingualValue(page, 'body'),
        footer_group: page.footer_group ?? '',
        is_published: page.is_published,
    }));
    const [values, setValues] = useState<Values>(initial);
    // A new page's address follows its English title until it is edited by hand.
    const [slugLocked, setSlugLocked] = useState(!creating);

    const dirty =
        BILINGUAL.some(
            (key) =>
                values[key].en !== initial[key].en ||
                values[key].ar !== initial[key].ar,
        ) ||
        values.slug !== initial.slug ||
        values.footer_group !== initial.footer_group ||
        values.is_published !== initial.is_published;
    const guard = useUnsavedGuard(dirty, {
        subject: creating ? 'this new page' : `the ${page.title} page`,
    });

    const set = <K extends keyof Values>(key: K, value: Values[K]) =>
        setValues((current) => ({ ...current, [key]: value }));

    const setTitle = (title: BilingualValue) =>
        setValues((current) => ({
            ...current,
            title,
            slug: slugLocked ? current.slug : slugify(title.en),
        }));

    const action =
        page.id === null
            ? PageController.store.form()
            : PageController.update.form(page.id);

    return (
        <>
            <Form
                {...action}
                options={{ preserveScroll: true }}
                // The server validates; its messages show under each field.
                noValidate
                className="mt-8 grid gap-5"
            >
                {({ errors, processing, hasErrors, clearErrors }) => (
                    <>
                        <Panel
                            title="Details"
                            description="The title in both languages, the line search engines show, the address and where the footer links to it."
                            actions={
                                <CompletenessBadge
                                    fields={[
                                        {
                                            name: 'title',
                                            label: 'Title',
                                            ...values.title,
                                        },
                                        {
                                            name: 'summary',
                                            label: 'Summary',
                                            ...values.summary,
                                        },
                                        {
                                            name: 'body',
                                            label: 'Page text',
                                            ...values.body,
                                        },
                                    ]}
                                />
                            }
                        >
                            <div className="grid gap-7">
                                <BilingualField
                                    label="Title"
                                    name="title"
                                    required
                                    maxLength={120}
                                    errors={errors}
                                    value={values.title}
                                    onValueChange={setTitle}
                                    placeholder={{
                                        en: 'Installation',
                                        ar: 'التركيب',
                                    }}
                                    inputProps={{ autoComplete: 'off' }}
                                />
                                <BilingualTextarea
                                    label="Summary"
                                    name="summary"
                                    optional
                                    maxLength={200}
                                    rows={2}
                                    errors={errors}
                                    value={values.summary}
                                    onValueChange={(summary) =>
                                        set('summary', summary)
                                    }
                                    hint="One or two sentences for search results and link previews. Once the English has one, the Arabic needs one too."
                                />
                                <div className="grid gap-x-5 gap-y-6 border-t border-white/10 pt-6 md:grid-cols-2 xl:grid-cols-12">
                                    <Field
                                        label="Address"
                                        error={errors.slug}
                                        hint={
                                            creating
                                                ? 'Made from the English title. The Arabic page has the same address under /ar.'
                                                : 'Shared by both languages. Changing it breaks links to the old address.'
                                        }
                                        className="xl:col-span-5"
                                    >
                                        <TextInput
                                            name="slug"
                                            value={values.slug}
                                            onChange={(event) => {
                                                setSlugLocked(true);
                                                set('slug', event.target.value);
                                            }}
                                            onBlur={(event) =>
                                                set(
                                                    'slug',
                                                    slugify(event.target.value),
                                                )
                                            }
                                            leading="/pages/"
                                            maxLength={120}
                                            autoComplete="off"
                                            autoCapitalize="off"
                                            spellCheck={false}
                                            placeholder="installation"
                                        />
                                    </Field>
                                    <Field
                                        label="Footer column"
                                        error={errors.footer_group}
                                        hint="Where the footer links to it, on both pages."
                                        className="xl:col-span-3"
                                    >
                                        <Select
                                            name="footer_group"
                                            value={values.footer_group}
                                            onChange={(event) =>
                                                set(
                                                    'footer_group',
                                                    event.target
                                                        .value as Values['footer_group'],
                                                )
                                            }
                                            placeholder="Not in the footer"
                                            options={footerGroups}
                                        />
                                    </Field>
                                    <div className="md:col-span-2 xl:col-span-4 xl:pt-7">
                                        <Toggle
                                            name="is_published"
                                            checked={values.is_published}
                                            onCheckedChange={(checked) =>
                                                set('is_published', checked)
                                            }
                                            label="Published"
                                            description={
                                                values.is_published
                                                    ? `Visitors can open ${addresses(values.slug)}${values.footer_group ? ' from the footer' : ''}.`
                                                    : 'Hidden from visitors in both languages. Admins can still open it.'
                                            }
                                        />
                                        {errors.is_published ? (
                                            <FieldError className="mt-2">
                                                {errors.is_published}
                                            </FieldError>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </Panel>

                        <Panel
                            variant="strong"
                            title="The text"
                            description="Written in Markdown in each language, previewed as visitors will read it."
                        >
                            <BilingualMarkdownField
                                label="Page text"
                                name="body"
                                required
                                errors={errors}
                                value={values.body}
                                onValueChange={(body) => set('body', body)}
                                previewUrl={PageController.preview.url()}
                                initialHtml={{ en: html, ar: htmlAr }}
                                viewHref={
                                    creating
                                        ? undefined
                                        : {
                                              en: show.url(page.slug),
                                              ar: showArabic.url(page.slug),
                                          }
                                }
                            />
                        </Panel>

                        <SaveBar
                            dirty={dirty}
                            isNew={creating}
                            processing={processing}
                            hasErrors={hasErrors}
                            savedAt={page.updated_at}
                            onDiscard={() => {
                                setValues(initial);
                                setSlugLocked(!creating);
                                clearErrors();
                            }}
                            createLabel="Add page"
                        />
                    </>
                )}
            </Form>
            {guard}
        </>
    );
}
