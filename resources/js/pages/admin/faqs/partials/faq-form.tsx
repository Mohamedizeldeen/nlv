import { Form } from '@inertiajs/react';
import { useState } from 'react';
import FaqController from '@/actions/App/Http/Controllers/Admin/FaqController';
import { CompletenessBadge } from '@/components/admin/arabic-completeness';
import {
    bilingualValue,
    isBlank,
    localeProps,
    localized,
} from '@/components/admin/bilingual';
import type {
    BilingualValue,
    ContentLocale,
} from '@/components/admin/bilingual';
import {
    BilingualField,
    BilingualTextarea,
} from '@/components/admin/bilingual-field';
import { Panel } from '@/components/admin/panel';
import { PreviewLocaleToggle } from '@/components/admin/preview-locale-toggle';
import { SaveBar } from '@/components/admin/save-bar';
import { Toggle } from '@/components/admin/toggle';
import { useUnsavedGuard } from '@/components/admin/use-unsaved-guard';
import type { FaqFormProps } from '../types';
import { FaqItem } from './faq-row';

const MAX_QUESTION = 200;
const MAX_ANSWER = 1000;

type Values = {
    question: BilingualValue;
    answer: BilingualValue;
    is_published: boolean;
};

/** Where the question sits in the landing row, counting from 1. */
function positionOf(
    faq: FaqFormProps['faq'],
    published: FaqFormProps['published'],
): { position: number; total: number } {
    const others = published.filter((item) => item.id !== faq?.id);

    if (!faq) {
        return { position: others.length + 1, total: others.length + 1 };
    }

    const before = others.filter(
        (item) =>
            item.sort_order < faq.sort_order ||
            (item.sort_order === faq.sort_order && item.id < faq.id),
    ).length;

    return { position: before + 1, total: others.length + 1 };
}

function trimmed(value: BilingualValue): BilingualValue {
    return { en: value.en.trim(), ar: value.ar.trim() };
}

function same(a: BilingualValue, b: BilingualValue): boolean {
    return a.en.trim() === b.en.trim() && a.ar.trim() === b.ar.trim();
}

/**
 * The question form (create and edit), in English and Arabic, with a
 * preview of the question as either landing page sets it.
 */
export function FaqForm({ faq, published, heading }: FaqFormProps) {
    const [initial] = useState<Values>(() => ({
        question: faq ? bilingualValue(faq, 'question') : { en: '', ar: '' },
        answer: faq ? bilingualValue(faq, 'answer') : { en: '', ar: '' },
        is_published: faq?.is_published ?? true,
    }));
    const [draft, setDraft] = useState(initial);
    const [locale, setLocale] = useState<ContentLocale>('en');
    const dirty =
        !same(draft.question, initial.question) ||
        !same(draft.answer, initial.answer) ||
        draft.is_published !== initial.is_published;
    const guard = useUnsavedGuard(dirty, {
        subject: faq ? 'this question' : 'this new question',
    });
    const { position, total } = positionOf(faq, published);
    const target = faq
        ? FaqController.update.form(faq)
        : FaqController.store.form();

    const question = localized(trimmed(draft.question), locale);
    const answer = localized(trimmed(draft.answer), locale);
    const untranslated =
        locale === 'ar' &&
        [draft.question, draft.answer].some(
            (value) => !isBlank(value.en) && isBlank(value.ar),
        );

    return (
        <>
            {guard}
            <Form
                {...target}
                options={{ preserveScroll: true }}
                className="mt-8 grid gap-5 lg:grid-cols-12 lg:items-start"
            >
                {({ errors, processing, hasErrors, clearErrors }) => (
                    <>
                        <div className="grid min-w-0 gap-5 lg:col-span-7">
                            <Panel
                                variant="strong"
                                title={faq ? 'The question' : 'New question'}
                                description="Short and plain, in both languages: the row sets three questions side by side."
                                actions={
                                    <CompletenessBadge
                                        fields={[
                                            {
                                                name: 'question',
                                                label: 'Question',
                                                ...draft.question,
                                            },
                                            {
                                                name: 'answer',
                                                label: 'Answer',
                                                ...draft.answer,
                                            },
                                        ]}
                                    />
                                }
                            >
                                <div className="grid gap-7">
                                    <BilingualField
                                        label="Question"
                                        name="question"
                                        required
                                        maxLength={MAX_QUESTION}
                                        showCount
                                        value={draft.question}
                                        onValueChange={(question) =>
                                            setDraft((current) => ({
                                                ...current,
                                                question,
                                            }))
                                        }
                                        errors={errors}
                                        hint="Phrase it the way a retailer would ask it."
                                        placeholder={{
                                            en: 'How long does installation take?',
                                            ar: 'كم يستغرق التركيب؟',
                                        }}
                                        inputProps={{ autoComplete: 'off' }}
                                    />
                                    <BilingualTextarea
                                        label="Answer"
                                        name="answer"
                                        required
                                        maxLength={MAX_ANSWER}
                                        rows={5}
                                        value={draft.answer}
                                        onValueChange={(answer) =>
                                            setDraft((current) => ({
                                                ...current,
                                                answer,
                                            }))
                                        }
                                        errors={errors}
                                        hint="Two or three sentences read best."
                                    />
                                    <Toggle
                                        name="is_published"
                                        checked={draft.is_published}
                                        onCheckedChange={(checked) =>
                                            setDraft((current) => ({
                                                ...current,
                                                is_published: checked,
                                            }))
                                        }
                                        label="Show on the landing page"
                                        description="On both pages. Hidden questions stay here, ready to publish later."
                                    />
                                </div>
                            </Panel>

                            <SaveBar
                                dirty={dirty}
                                isNew={!faq}
                                processing={processing}
                                hasErrors={hasErrors}
                                savedAt={faq?.updated_at}
                                onDiscard={() => {
                                    setDraft(initial);
                                    clearErrors();
                                }}
                                createLabel="Add question"
                            />
                        </div>

                        <aside className="min-w-0 lg:sticky lg:top-6 lg:col-span-5">
                            <Panel
                                kicker="Live preview"
                                title="Under the plans"
                                description={
                                    draft.is_published
                                        ? `Question ${position} of ${total} in the row.`
                                        : 'Hidden: not shown on the page.'
                                }
                                actions={
                                    <PreviewLocaleToggle
                                        value={locale}
                                        onValueChange={setLocale}
                                    />
                                }
                            >
                                <div {...localeProps(locale)}>
                                    <p className="text-kicker font-medium text-smoke uppercase">
                                        {heading[locale]}
                                    </p>
                                    <div
                                        className={
                                            draft.is_published
                                                ? 'mt-5'
                                                : 'mt-5 opacity-50'
                                        }
                                    >
                                        <FaqItem
                                            highlight={draft.is_published}
                                            question={
                                                question || (
                                                    <span
                                                        lang="en"
                                                        className="text-smoke/70 italic"
                                                    >
                                                        The question
                                                    </span>
                                                )
                                            }
                                            answer={
                                                answer || (
                                                    <span
                                                        lang="en"
                                                        className="text-smoke/70 italic"
                                                    >
                                                        The answer, in a
                                                        sentence or two.
                                                    </span>
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                                {untranslated ? (
                                    <p className="mt-5 text-[12.5px] leading-relaxed text-smoke">
                                        Not translated yet: the Arabic page
                                        shows the English here.
                                    </p>
                                ) : null}
                            </Panel>
                        </aside>
                    </>
                )}
            </Form>
        </>
    );
}
