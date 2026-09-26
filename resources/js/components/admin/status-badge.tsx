import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { LeadStatus } from '@/types/admin';

export type BadgeTone =
    | 'mint'
    | 'solid'
    | 'lagoon'
    | 'neutral'
    | 'muted'
    | 'coral';

const TONES: Record<BadgeTone, string> = {
    /** Needs action: filled mint, ink text. */
    solid: 'bg-mint text-ink ring-mint shadow-[inset_0_1px_0_oklch(1_0_0/0.5)]',
    /** Good outcome / live. */
    mint: 'bg-mint/[0.12] text-mint ring-mint/35',
    /** In progress. */
    lagoon: 'bg-lagoon/[0.14] text-[oklch(0.8_0.09_195)] ring-lagoon/40',
    neutral: 'bg-white/[0.07] text-bone ring-white/20',
    /** Closed / hidden. */
    muted: 'bg-transparent text-smoke ring-white/[0.14]',
    coral: 'bg-coral/[0.12] text-coral ring-coral/40',
};

/**
 * A small spaced-caps label with a tinted hairline frame: status as text,
 * never as a coloured dot. Keep the wording to one or two words.
 */
export function Badge({
    tone = 'neutral',
    className,
    children,
}: {
    tone?: BadgeTone;
    className?: string;
    children: ReactNode;
}) {
    return (
        <span
            className={cn(
                'inline-flex h-6 shrink-0 items-center rounded-[8px] px-2 text-[10px] leading-none font-medium tracking-[0.16em] whitespace-nowrap uppercase ring-1 ring-inset',
                TONES[tone],
                className,
            )}
        >
            {children}
        </span>
    );
}

export const LEAD_STATUS: Record<
    LeadStatus,
    { label: string; tone: BadgeTone }
> = {
    new: { label: 'New', tone: 'solid' },
    contacted: { label: 'Contacted', tone: 'neutral' },
    qualified: { label: 'Qualified', tone: 'lagoon' },
    won: { label: 'Won', tone: 'mint' },
    lost: { label: 'Lost', tone: 'muted' },
};

/** Lead status options in pipeline order, for <Select> and filters. */
export const LEAD_STATUS_OPTIONS = (
    Object.keys(LEAD_STATUS) as LeadStatus[]
).map((value) => ({ value, label: LEAD_STATUS[value].label }));

function isLeadStatus(status: string): status is LeadStatus {
    return status in LEAD_STATUS;
}

/** A lead's pipeline status: new → contacted → qualified → won / lost. */
export function StatusBadge({
    status,
    className,
}: {
    /** A LeadStatus; unknown values print as-is. */
    status: string;
    className?: string;
}) {
    const known = isLeadStatus(status) ? LEAD_STATUS[status] : null;

    return (
        <Badge tone={known?.tone ?? 'neutral'} className={className}>
            {known?.label ?? status}
        </Badge>
    );
}

/** "Live" / "Hidden" for anything with `is_published`. */
export function PublishedBadge({
    published,
    className,
}: {
    published: boolean;
    className?: string;
}) {
    return (
        <Badge tone={published ? 'mint' : 'muted'} className={className}>
            {published ? 'Live' : 'Hidden'}
        </Badge>
    );
}
