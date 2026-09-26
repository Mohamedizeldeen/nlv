import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/*
 * The questions row under the plans on the landing page (the end of
 * sections/pricing.tsx): a spaced-caps kicker, then the questions three to
 * a row, each under a hairline. Sized by its container.
 */

export type FaqRowItem = {
    id: number | string;
    question: string;
    answer: string;
    /** Marks the one being edited. */
    highlight?: boolean;
};

export function FaqItem({
    question,
    answer,
    highlight = false,
    as: Tag = 'div',
}: {
    question: ReactNode;
    answer: ReactNode;
    highlight?: boolean;
    as?: 'div' | 'li';
}) {
    return (
        <Tag
            className={cn(
                'min-w-0 border-t pt-5 transition-colors duration-300',
                highlight ? 'border-mint/70' : 'border-white/10',
            )}
        >
            <p className="text-[16px] font-medium break-words text-bone">
                {question}
            </p>
            <p className="mt-2.5 text-[15px] leading-relaxed text-pretty break-words text-mist">
                {answer}
            </p>
        </Tag>
    );
}

export function FaqRow({
    heading,
    items,
    className,
}: {
    heading: string;
    items: FaqRowItem[];
    className?: string;
}) {
    return (
        <div className={cn('@container', className)}>
            <div className="grid gap-y-6 @min-[56rem]:grid-cols-12 @min-[56rem]:gap-x-8">
                <p className="text-kicker font-medium text-smoke uppercase @min-[56rem]:col-span-3 @min-[56rem]:pt-5">
                    {heading}
                </p>
                <ul className="grid gap-8 @min-[36rem]:grid-cols-2 @min-[48rem]:grid-cols-3 @min-[56rem]:col-span-9">
                    {items.map((item) => (
                        <FaqItem
                            key={item.id}
                            as="li"
                            question={item.question}
                            answer={item.answer}
                            highlight={item.highlight}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
}
