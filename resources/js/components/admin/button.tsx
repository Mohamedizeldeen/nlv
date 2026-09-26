import type { ComponentProps } from 'react';
import { cta } from '@/components/landing/primitives';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'glass' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md';

const SIZE: Record<ButtonSize, string> = {
    // The landing's `sm` (h-10) is the admin default; `xs` fits table rows.
    xs: 'h-8 gap-1.5 rounded-[10px] px-3 text-[13px] [&_svg]:size-3.5',
    sm: '[&_svg]:size-4',
    md: '[&_svg]:size-4',
};

/**
 * Class builder for admin buttons and links: the landing's `cta()` plus a
 * compact `xs` size and a coral `danger` variant. Apply it to <button>,
 * <Link> or <a>.
 */
export function button({
    variant = 'primary',
    size = 'sm',
    className,
}: {
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
} = {}): string {
    return cn(
        cta({
            variant: variant === 'danger' ? 'ghost' : variant,
            size: size === 'xs' ? 'sm' : size,
        }),
        'cursor-pointer',
        SIZE[size],
        variant === 'ghost' && 'px-2.5 hover:bg-white/[0.06]',
        variant === 'danger' &&
            'bg-coral/[0.07] text-coral ring-1 ring-coral/30 ring-inset hover:-translate-y-0.5 hover:bg-coral/15 hover:text-[oklch(0.8_0.14_38)] focus-visible:ring-2 focus-visible:ring-coral/70',
        className,
    );
}

type ButtonProps = ComponentProps<'button'> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
};

/** A <button type="button"> with the admin styles (pass type="submit" for forms). */
export function Button({
    variant,
    size,
    className,
    type = 'button',
    ...props
}: ButtonProps) {
    return (
        <button
            type={type}
            className={button({ variant, size, className })}
            {...props}
        />
    );
}
