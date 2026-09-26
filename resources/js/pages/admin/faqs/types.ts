/*
 * Props of the FAQ pages (App\Http\Controllers\Admin\FaqController). Each
 * question and answer has an Arabic twin (`question_ar`, `answer_ar`),
 * shown on /ar.
 */
import type { ContentLocale } from '@/components/admin/bilingual';

export type FaqText = 'question' | 'answer';

export type AdminFaq = {
    id: number;
    question: string;
    answer: string;
    question_ar: string | null;
    answer_ar: string | null;
    /** Texts written in English with no Arabic yet (/ar shows the English). */
    missing_arabic: FaqText[];
    is_published: boolean;
    sort_order: number;
    /** ISO 8601 */
    updated_at: string | null;
};

/** A question as the landing pages show it. */
export type PublishedFaq = {
    id: number;
    question: string;
    answer: string;
    question_ar: string | null;
    answer_ar: string | null;
    sort_order: number;
};

export type FaqStatusFilter = 'live' | 'hidden';

export type FaqsIndexProps = {
    /** Matching questions, in page order. */
    faqs: AdminFaq[];
    filters: { search: string | null; status: FaqStatusFilter | null };
    counts: { all: number; live: number };
    /** What the landing shows now, in order. */
    published: PublishedFaq[];
    /** The kicker beside the questions on each page ("Asked before every order"). */
    heading: Record<ContentLocale, string>;
};

export type FaqFormProps = {
    /** Null on the create page. */
    faq: AdminFaq | null;
    published: PublishedFaq[];
    heading: Record<ContentLocale, string>;
};
