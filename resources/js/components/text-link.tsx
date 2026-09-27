import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type Props = ComponentProps<typeof Link>;

/** An inline link in mint with a hairline underline (sign-in pages). */
export default function TextLink({
    className = '',
    children,
    ...props
}: Props) {
    return (
        <Link
            className={cn(
                'cursor-pointer rounded-[4px] text-mint underline decoration-mint/40 decoration-1 underline-offset-[0.28em] transition-[text-decoration-color,color] duration-[380ms] ease-glass hover:text-[oklch(0.9_0.1_160)] hover:decoration-mint focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none',
                className,
            )}
            {...props}
        >
            {children}
        </Link>
    );
}
