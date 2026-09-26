import { Fragment } from 'react';
import type { ReactNode } from 'react';
import type { MessageKey, MessageVars, Translate } from '@/i18n';

/** A private-use character: never part of any copy. */
const MARK = '\u{E000}';

/**
 * A templated message as React nodes, one text node per literal part and
 * one per placeholder value: `'{count} pieces'` gives ['412', ' pieces'],
 * the same nodes JSX writes for `{count} pieces`. Chrome shapes separate
 * text nodes separately, so a line moved from JSX into a dictionary keeps
 * its exact rendering. Values may also be elements (a figure in a
 * `bidi-ltr` span); numbers are shown as given, so format them first.
 *
 *     messageParts(t, 'features.stockLeft', { count: 2 })
 */
export function messageParts<Key extends MessageKey>(
    t: Translate,
    key: Key,
    values: Record<MessageVars<Key>, ReactNode>,
): ReactNode[] {
    const entries = Object.entries(values) as [string, ReactNode][];
    const markers = Object.fromEntries(
        entries.map(([name], index) => [name, `${MARK}${index}${MARK}`]),
    );
    const text = (t as (key: string, vars: Record<string, string>) => string)(
        key,
        markers,
    );

    return text
        .split(MARK)
        .map((part, index) =>
            index % 2 === 1 ? entries[Number(part)][1] : part,
        )
        .filter((part) => part !== '')
        .map((part, index) => <Fragment key={index}>{part}</Fragment>);
}
