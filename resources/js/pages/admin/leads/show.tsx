import { Form, Head, Link } from '@inertiajs/react';
import { Mail, MessageCircle, Phone, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import LeadController from '@/actions/App/Http/Controllers/Admin/LeadController';
import { Button, button } from '@/components/admin/button';
import { ConfirmDialog } from '@/components/admin/dialog';
import { Field } from '@/components/admin/field';
import { formatNumber, plural } from '@/components/admin/format';
import { KeyValue } from '@/components/admin/key-value';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/admin/panel';
import { RelativeTime } from '@/components/admin/relative-time';
import { useSaveShortcut } from '@/components/admin/save-bar';
import { Select } from '@/components/admin/select';
import { StatusBadge } from '@/components/admin/status-badge';
import { Textarea } from '@/components/admin/textarea';
import { useUnsavedGuard } from '@/components/admin/use-unsaved-guard';
import { cn } from '@/lib/utils';
import type { LeadStatus } from '@/types/admin';
import { ExactTime, RecentAgo } from './partials/exact-time';
import { LeadTimeline } from './partials/timeline';
import {
    VisitorText,
    isArabicText,
    isolate,
    languageName,
} from './partials/visitor-text';
import type { LeadDetail, LeadShowProps } from './types';

const FORM_OPTIONS = { preserveScroll: true, preserveState: true } as const;

const textLink =
    'rounded-[6px] text-bone underline decoration-white/25 underline-offset-[5px] transition-colors duration-300 ease-glass hover:text-mint hover:decoration-mint/60 focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none';

function mailto(lead: LeadDetail): string {
    // In the visitor's language: a request from the Arabic page is answered
    // in Arabic (the reference is kept left to right inside the Arabic line).
    const subject = encodeURIComponent(
        lead.locale === 'ar'
            ? `طلبك لجهاز TryOn رقم \u2066${lead.reference}\u2069`
            : `Your TryOn order request ${lead.reference}`,
    );

    // "?", "&", "#" and "%" are valid in an address but would start a header
    // (e.g. "a?cc=someone@x.com") in a mailto: link, so they are encoded.
    const address = lead.email.replace(/[?&#%]/g, (character) =>
        encodeURIComponent(character),
    );

    return `mailto:${address}?subject=${subject}`;
}

function tel(phone: string): string {
    return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** The full stop after "Maison Rimal", unless the name already ends with one. */
function stopAfter(text: string): string {
    return /[.!?]$/.test(text) ? '' : '.';
}

/** One figure of the request strip: a Bodoni value over a spaced-caps label. */
function Figure({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="min-w-0 px-5 py-4 sm:px-6 sm:py-5">
            <dt className="text-[10px] font-medium tracking-[0.22em] text-smoke uppercase">
                {label}
            </dt>
            <dd className="mt-2.5 truncate font-display text-[1.75rem] leading-none font-medium text-bone tabular-nums sm:text-[2rem]">
                {value}
            </dd>
        </div>
    );
}

function RequestPanel({ lead }: { lead: LeadDetail }) {
    // An Arabic message reads right to left, quote mark and caption included.
    const rtl = isArabicText(lead.message);
    const comma = rtl ? '، ' : ', ';

    return (
        <Panel
            variant="strong"
            padded={false}
            kicker={`Order request ${lead.reference}`}
            title="What they asked for"
            className="lg:col-span-8 lg:col-start-1 lg:row-start-1"
        >
            <dl className="grid grid-cols-2 divide-white/10 border-b border-white/10 sm:grid-cols-[auto_auto_minmax(0,1fr)] sm:divide-x max-sm:[&>div:first-child]:border-r max-sm:[&>div:first-child]:border-white/10 max-sm:[&>div:last-child]:col-span-2 max-sm:[&>div:last-child]:border-t max-sm:[&>div:last-child]:border-white/10">
                <Figure
                    label={lead.devices === 1 ? 'Device' : 'Devices'}
                    value={formatNumber(lead.devices)}
                />
                <Figure label="Plan" value={lead.planLabel} />
                <Figure
                    label="Sent from"
                    value={
                        lead.sourceLabel ?? (
                            <span className="text-smoke">Not recorded</span>
                        )
                    }
                />
            </dl>
            <figure
                dir={rtl ? 'rtl' : undefined}
                className="px-5 py-6 sm:px-8 sm:py-8"
            >
                <span
                    aria-hidden
                    className="block h-8 font-display text-[4.5rem] leading-[0.9] text-mint/70 select-none"
                >
                    {rtl ? '”' : '“'}
                </span>
                {/* The visitor's own words: plain text, line breaks kept, never markup. */}
                <blockquote
                    lang={rtl ? 'ar' : undefined}
                    className="mt-1 max-w-[68ch] text-[16.5px] leading-[1.7] [overflow-wrap:anywhere] whitespace-pre-line text-bone"
                >
                    {lead.message}
                </blockquote>
                <figcaption className="mt-5 text-[13px] text-smoke">
                    <VisitorText text={lead.name} className="text-mist" />
                    {comma}
                    <VisitorText text={lead.company} /> ·{' '}
                    <VisitorText text={lead.city} />
                    {comma}
                    <VisitorText text={lead.country} />
                </figcaption>
            </figure>
        </Panel>
    );
}

function ContactPanel({ lead }: { lead: LeadDetail }) {
    return (
        <Panel
            title="Contact"
            description="Their reply-to details, exactly as they typed them."
            className="lg:col-span-8 lg:col-start-1 lg:row-start-2"
            actions={
                <>
                    <a
                        href={mailto(lead)}
                        className={button({ variant: 'glass', size: 'xs' })}
                    >
                        <Mail aria-hidden /> Email
                    </a>
                    <a
                        href={tel(lead.phone)}
                        className={button({ variant: 'glass', size: 'xs' })}
                    >
                        <Phone aria-hidden /> Call
                    </a>
                    {lead.whatsapp ? (
                        <a
                            href={`https://wa.me/${lead.whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={button({ variant: 'glass', size: 'xs' })}
                        >
                            <MessageCircle aria-hidden /> WhatsApp
                            <span className="sr-only">
                                {' '}
                                (opens in a new tab)
                            </span>
                        </a>
                    ) : null}
                </>
            }
        >
            <KeyValue
                className="-mt-3"
                items={[
                    { label: 'Name', value: <VisitorText text={lead.name} /> },
                    {
                        label: 'Company',
                        value: <VisitorText text={lead.company} />,
                    },
                    {
                        label: 'Email',
                        value: (
                            <a href={mailto(lead)} className={textLink}>
                                {lead.email}
                            </a>
                        ),
                    },
                    {
                        label: 'Phone',
                        value: (
                            <span className="flex flex-wrap items-baseline gap-x-3">
                                <a
                                    href={tel(lead.phone)}
                                    className={cn(textLink, 'tabular-nums')}
                                >
                                    {lead.phone}
                                </a>
                                {lead.whatsapp ? null : (
                                    <span className="text-[12.5px] text-smoke">
                                        No country code, so no WhatsApp link
                                    </span>
                                )}
                            </span>
                        ),
                    },
                    { label: 'City', value: <VisitorText text={lead.city} /> },
                    {
                        label: 'Country',
                        value: <VisitorText text={lead.country} />,
                    },
                    {
                        label: 'Language',
                        wide: true,
                        value: <Language lead={lead} />,
                    },
                ]}
            />
        </Panel>
    );
}

/** The language of the page they ordered from: the one to answer in. */
function Language({ lead }: { lead: LeadDetail }) {
    if (lead.locale !== 'ar') {
        return languageName(lead.locale);
    }

    return (
        <>
            {languageName(lead.locale)}{' '}
            <span className="text-mint">— reply in Arabic</span>
            <span className="mt-1 block text-[12.5px] leading-normal text-smoke">
                Sent from the Arabic page. Email and Reply open with an Arabic
                subject line.
            </span>
        </>
    );
}

function StatusForm({
    lead,
    statuses,
    status,
    setStatus,
    note,
    setNote,
    noteMax,
}: {
    lead: LeadDetail;
    statuses: LeadShowProps['statuses'];
    status: LeadStatus;
    setStatus: (status: LeadStatus) => void;
    note: string;
    setNote: (note: string) => void;
    noteMax: number;
}) {
    const changed = status !== lead.status;
    const hasNote = note.trim() !== '';

    return (
        <Form
            {...LeadController.update.form(lead)}
            options={FORM_OPTIONS}
            onSuccess={() => setNote('')}
        >
            {({ errors, processing }) => (
                <Panel
                    title="Status"
                    description={
                        lead.contactedAt ? (
                            <>
                                First contacted{' '}
                                <RelativeTime value={lead.contactedAt} />.
                            </>
                        ) : (
                            'Nobody has replied yet.'
                        )
                    }
                    actions={<StatusBadge status={lead.status} />}
                    footer={
                        <button
                            type="submit"
                            className={button()}
                            disabled={processing || (!changed && !hasNote)}
                        >
                            {changed || !hasNote ? 'Update status' : 'Add note'}
                        </button>
                    }
                >
                    <div className="grid gap-5">
                        <Field label="Move to" error={errors.status}>
                            <Select
                                name="status"
                                options={statuses}
                                value={status}
                                onChange={(event) =>
                                    setStatus(event.target.value as LeadStatus)
                                }
                            />
                        </Field>
                        <Field
                            label="Note for the timeline"
                            optional
                            error={errors.note}
                            hint="What was said or agreed. Saved with the change, or on its own."
                        >
                            <Textarea
                                name="note"
                                rows={3}
                                maxLength={noteMax}
                                value={note}
                                onChange={(event) =>
                                    setNote(event.target.value)
                                }
                                placeholder="Called on Tuesday; they want a demo first."
                            />
                        </Field>
                    </div>
                </Panel>
            )}
        </Form>
    );
}

function AssigneeForm({
    lead,
    admins,
    assignee,
    setAssignee,
}: {
    lead: LeadDetail;
    admins: LeadShowProps['admins'];
    assignee: string;
    setAssignee: (value: string) => void;
}) {
    const current = lead.assignedTo === null ? '' : String(lead.assignedTo);

    return (
        <Form {...LeadController.update.form(lead)} options={FORM_OPTIONS}>
            {({ errors, processing }) => (
                <Panel
                    title="Follow-up"
                    description="The admin who answers this request."
                    footer={
                        <button
                            type="submit"
                            className={button({ variant: 'glass' })}
                            disabled={processing || assignee === current}
                        >
                            Save
                        </button>
                    }
                >
                    <Field label="Assigned to" error={errors.assigned_to}>
                        <Select
                            name="assigned_to"
                            placeholder="Nobody yet"
                            options={admins}
                            value={assignee}
                            onChange={(event) =>
                                setAssignee(event.target.value)
                            }
                        />
                    </Field>
                </Panel>
            )}
        </Form>
    );
}

function NotesForm({
    lead,
    notes,
    setNotes,
    dirty,
    notesMax,
}: {
    lead: LeadDetail;
    notes: string;
    setNotes: (notes: string) => void;
    dirty: boolean;
    notesMax: number;
}) {
    return (
        <Form {...LeadController.update.form(lead)} options={FORM_OPTIONS}>
            {({ errors, processing }) => (
                <Panel
                    title="Team notes"
                    description="Only admins see these; every save is logged."
                    footer={
                        <>
                            {dirty ? (
                                <span className="mr-auto text-[12.5px] text-smoke">
                                    Not saved yet
                                </span>
                            ) : null}
                            <button
                                type="submit"
                                className={button({ variant: 'glass' })}
                                disabled={processing || !dirty}
                            >
                                Save notes
                            </button>
                        </>
                    }
                >
                    <Field label="Notes" error={errors.admin_notes}>
                        <Textarea
                            name="admin_notes"
                            rows={5}
                            maxLength={notesMax}
                            showCount
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Budget, timing, who decides, which store."
                        />
                    </Field>
                </Panel>
            )}
        </Form>
    );
}

/** Read-only follow-up for a deleted lead (restore it to edit). */
function DeletedSummary({ lead }: { lead: LeadDetail }) {
    return (
        <Panel
            title="Follow-up"
            description="Restore the request to change these."
        >
            <KeyValue
                columns={1}
                className="-mt-3"
                items={[
                    {
                        label: 'Status',
                        value: <StatusBadge status={lead.status} />,
                    },
                    { label: 'Assigned to', value: lead.assignee },
                    { label: 'Team notes', value: lead.adminNotes, wide: true },
                ]}
            />
        </Panel>
    );
}

function RecordPanel({ lead }: { lead: LeadDetail }) {
    return (
        <Panel
            title="Record"
            description="How and when the request arrived."
            className="lg:col-span-8 lg:col-start-1 lg:row-start-3"
        >
            <KeyValue
                columns={3}
                className="-mt-3"
                items={[
                    {
                        label: 'Reference',
                        value: (
                            <span className="tabular-nums">
                                {lead.reference}
                            </span>
                        ),
                    },
                    {
                        label: 'Received',
                        value: <ExactTime value={lead.createdAt} />,
                    },
                    {
                        label: 'Consent to be contacted',
                        value: lead.consentAt ? (
                            <>
                                Given <ExactTime value={lead.consentAt} />
                            </>
                        ) : null,
                    },
                    {
                        label: 'First contacted',
                        value: lead.contactedAt ? (
                            <ExactTime value={lead.contactedAt} />
                        ) : null,
                    },
                    {
                        label: 'IP address',
                        value: lead.ipAddress ? (
                            <span className="font-mono text-[13px]">
                                {lead.ipAddress}
                            </span>
                        ) : null,
                    },
                    {
                        label: 'Last change',
                        value: <RelativeTime value={lead.updatedAt} />,
                    },
                    {
                        label: 'Browser',
                        wide: true,
                        value: lead.userAgent ? (
                            <span className="block font-mono text-[12px] leading-relaxed text-mist">
                                {lead.userAgent}
                            </span>
                        ) : null,
                    },
                ]}
            />
        </Panel>
    );
}

export default function LeadShow({
    lead,
    statuses,
    admins,
    timeline,
    limits,
}: LeadShowProps) {
    const deleted = lead.deletedAt !== null;
    const [status, setStatus] = useState<LeadStatus>(lead.status);
    const [note, setNote] = useState('');
    const [assignee, setAssignee] = useState(
        lead.assignedTo === null ? '' : String(lead.assignedTo),
    );
    const [notes, setNotes] = useState(lead.adminNotes ?? '');

    const notesDirty = notes.trim() !== (lead.adminNotes ?? '').trim();
    const dirty =
        !deleted &&
        (status !== lead.status ||
            note.trim() !== '' ||
            assignee !==
                (lead.assignedTo === null ? '' : String(lead.assignedTo)) ||
            notesDirty);

    const leaveDialog = useUnsavedGuard(dirty, { subject: lead.reference });

    // Cmd/Ctrl+S saves the panel being edited (status, follow-up or notes).
    useSaveShortcut(() => {
        const focused = document.activeElement;

        return focused instanceof HTMLElement
            ? focused.closest<HTMLFormElement>('#admin-main form')
            : null;
    });

    const firstName = lead.name.trim().split(/\s+/)[0] || lead.name;
    const arabic = lead.locale === 'ar';
    // "2 devices on the Lease plan" / "1 device, plan not chosen yet".
    const planPhrase =
        lead.plan === 'unsure'
            ? ', plan not chosen yet'
            : ` on the ${lead.planLabel} plan`;

    return (
        <>
            <Head title={`${lead.reference} · Leads · Admin`} />

            <PageHeader
                crumbs={[{ label: lead.reference }]}
                title={
                    <>
                        <VisitorText text={lead.name} />,{' '}
                        <em>
                            <VisitorText text={lead.company} />
                            {stopAfter(lead.company)}
                        </em>
                    </>
                }
                description={
                    <>
                        {plural(lead.devices, 'device')}
                        {planPhrase}, from <VisitorText text={lead.city} />,{' '}
                        <VisitorText text={lead.country} />
                        {arabic ? ', on the Arabic page' : ''}. Received{' '}
                        <ExactTime value={lead.createdAt} />
                        <RecentAgo
                            value={lead.createdAt}
                            className="whitespace-nowrap text-smoke"
                        />
                        .
                    </>
                }
                actions={
                    deleted ? (
                        <Link
                            href={LeadController.restore.url(lead)}
                            method="post"
                            as="button"
                            preserveScroll
                            className={button()}
                        >
                            <RotateCcw aria-hidden /> Restore
                        </Link>
                    ) : (
                        <>
                            <ConfirmDialog
                                trigger={
                                    <Button variant="danger">
                                        <Trash2 aria-hidden /> Delete
                                    </Button>
                                }
                                title={
                                    <>
                                        Delete this <em>request?</em>
                                    </>
                                }
                                description={`${lead.reference} from ${isolate(lead.name)}, ${isolate(lead.company)}, moves to Deleted. You can restore it from there at any time.`}
                                confirmLabel="Delete request"
                                form={LeadController.destroy.form(lead)}
                            />
                            <a href={mailto(lead)} className={button()}>
                                <Mail aria-hidden />
                                <span>
                                    Reply to <VisitorText text={firstName} />
                                    {arabic ? ' in Arabic' : null}
                                </span>
                            </a>
                        </>
                    )
                }
            />

            {deleted && lead.deletedAt ? (
                <div
                    role="status"
                    className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-[20px] border border-coral/30 bg-coral/[0.06] px-5 py-4 text-[14px] text-mist sm:px-6"
                >
                    <p>
                        <span className="font-medium text-bone">
                            Deleted <RelativeTime value={lead.deletedAt} />.
                        </span>{' '}
                        It is out of the list and the dashboard. Restore it to
                        change its status, assignee or notes.
                    </p>
                </div>
            ) : null}

            <div className="mt-8 grid gap-5 lg:grid-cols-12 lg:grid-rows-[auto_auto_auto_1fr] lg:items-start">
                <RequestPanel lead={lead} />
                <ContactPanel lead={lead} />

                <div className="grid content-start gap-5 lg:col-span-4 lg:col-start-9 lg:row-span-4 lg:row-start-1">
                    {deleted ? (
                        <DeletedSummary lead={lead} />
                    ) : (
                        <>
                            <StatusForm
                                lead={lead}
                                statuses={statuses}
                                status={status}
                                setStatus={setStatus}
                                note={note}
                                setNote={setNote}
                                noteMax={limits.note}
                            />
                            <AssigneeForm
                                lead={lead}
                                admins={admins}
                                assignee={assignee}
                                setAssignee={setAssignee}
                            />
                            <NotesForm
                                lead={lead}
                                notes={notes}
                                setNotes={setNotes}
                                dirty={notesDirty}
                                notesMax={limits.notes}
                            />
                        </>
                    )}
                </div>

                <RecordPanel lead={lead} />

                <Panel
                    title="Timeline"
                    description="Everything done to this request, newest first."
                    padded={false}
                    className="lg:col-span-8 lg:col-start-1 lg:row-start-4"
                >
                    <LeadTimeline entries={timeline} />
                </Panel>
            </div>

            {leaveDialog}
        </>
    );
}
