import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { TextInput } from '@/components/admin/text-input';
import type { TextInputProps } from '@/components/admin/text-input';

/**
 * The admin kit's glass text field for passwords, with a show/hide button
 * at its end. Inside a <Field> it picks up the label, hint and error
 * wiring like any kit input; `ref` reaches the <input>.
 */
export default function PasswordInput(
    props: Omit<TextInputProps, 'type' | 'trailing'>,
) {
    const [visible, setVisible] = useState(false);

    return (
        <TextInput
            {...props}
            type={visible ? 'text' : 'password'}
            inputClassName="[&::-ms-reveal]:hidden"
            trailing={
                <button
                    type="button"
                    onClick={() => setVisible((shown) => !shown)}
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    aria-pressed={visible}
                    className="-mr-2 grid size-8 cursor-pointer place-items-center rounded-[10px] text-smoke transition-colors duration-300 ease-glass hover:bg-white/[0.08] hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                >
                    {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                </button>
            }
        />
    );
}
