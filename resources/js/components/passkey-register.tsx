import { usePasskeyRegister } from '@laravel/passkeys/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/admin/button';
import { Field } from '@/components/admin/field';
import { TextInput } from '@/components/admin/text-input';
import { Spinner } from '@/components/ui/spinner';

/** "Chrome on Mac": a starting name for a new passkey. */
function guessDeviceName(): string {
    const ua = navigator.userAgent;

    const browser = [
        { pattern: /Edg|Edge/, name: 'Edge' },
        { pattern: /OPR|Opera|OPiOS/, name: 'Opera' },
        { pattern: /Firefox|FxiOS/, name: 'Firefox' },
        { pattern: /Chrome|CriOS/, name: 'Chrome' },
        { pattern: /Safari/, name: 'Safari' },
    ].find(({ pattern }) => pattern.test(ua))?.name;

    const os = [
        { pattern: /iPhone/, name: 'iPhone' },
        { pattern: /iPad|Macintosh(?=.*Mobile)/, name: 'iPad' },
        { pattern: /Android/, name: 'Android' },
        { pattern: /Mac/, name: 'Mac' },
        { pattern: /Windows/, name: 'Windows' },
    ].find(({ pattern }) => pattern.test(ua))?.name;

    return [browser, os].filter(Boolean).join(' on ');
}

type Props = {
    onSuccess: () => void;
};

/**
 * "Add a passkey": a name for it, then the browser's own passkey prompt.
 * Sits in the passkeys panel's footer.
 */
export default function PasskeyRegistration({ onSuccess }: Props) {
    const [name, setName] = useState(guessDeviceName);
    const [showForm, setShowForm] = useState(false);
    const { register, isLoading, error, isSupported } = usePasskeyRegister({
        onSuccess: () => {
            setName('');
            setShowForm(false);
            onSuccess();
        },
    });

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        if (!name.trim()) {
            return;
        }

        await register(name.trim());
    };

    if (!isSupported) {
        return (
            <p className="mr-auto text-[13px] text-smoke">
                This browser can’t create passkeys. Try a recent Chrome, Safari,
                Edge or Firefox.
            </p>
        );
    }

    if (!showForm) {
        return (
            <Button variant="glass" onClick={() => setShowForm(true)}>
                <Plus aria-hidden />
                Add a passkey
            </Button>
        );
    }

    return (
        <form
            onSubmit={(event) => void handleSubmit(event)}
            className="grid w-full gap-4"
        >
            <Field
                label="Name this passkey"
                hint="So you can tell it apart later, e.g. “MacBook” or “iPhone”."
                error={error ?? undefined}
            >
                <TextInput
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="MacBook, iPhone…"
                    maxLength={255}
                    autoFocus
                />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
                <Button
                    variant="ghost"
                    onClick={() => {
                        setShowForm(false);
                        setName(guessDeviceName());
                    }}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !name.trim()}>
                    {isLoading ? <Spinner /> : null}
                    {isLoading ? 'Waiting for your device…' : 'Create passkey'}
                </Button>
            </div>
        </form>
    );
}
