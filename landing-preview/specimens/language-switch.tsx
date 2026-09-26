// Dev-only specimen: ?s=language-switch (add &lang=ar for the Arabic page).
// The three LanguageSwitch variants in the surroundings they are made for.
import { LanguageSwitch } from '@/components/landing/language-switch';
import { Container, Wordmark, cta } from '@/components/landing/primitives';

export default function LanguageSwitchSpecimen() {
    return (
        <Container className="grid grid-cols-[minmax(0,1fr)] gap-16 py-24">
            <section>
                <p className="mb-4 text-kicker text-smoke uppercase">navbar</p>
                <div className="flex h-16 items-center justify-between gap-4 rounded-[22px] border border-white/[0.12] bg-[oklch(0.16_0.02_200/0.55)] ps-5 pe-3 backdrop-blur-[14px]">
                    <Wordmark />
                    <div className="flex items-center">
                        <span className="hidden rounded-[12px] px-3 py-2 text-sm text-mist sm:inline">
                            Link
                        </span>
                        <span className="hidden rounded-[12px] px-3 py-2 text-sm text-mist sm:inline">
                            Link
                        </span>
                        <LanguageSwitch variant="navbar" />
                    </div>
                    <span
                        className={cta({
                            variant: 'primary',
                            size: 'sm',
                            className: 'max-sm:hidden',
                        })}
                    >
                        CTA
                    </span>
                </div>
            </section>

            <section className="max-w-[27rem]">
                <p className="mb-4 text-kicker text-smoke uppercase">menu</p>
                <div className="glass-rim relative rounded-[28px] px-5 py-5 glass-strong">
                    <div className="flex items-center justify-between border-t border-white/10 pt-3 text-sm text-smoke">
                        <span>Label</span>
                        <LanguageSwitch variant="menu" />
                    </div>
                </div>
            </section>

            <section>
                <p className="mb-4 text-kicker text-smoke uppercase">footer</p>
                <div className="flex flex-col gap-2 border-t border-white/10 pt-8 pb-8 text-[13px] text-smoke sm:flex-row sm:items-center sm:justify-between">
                    <p>© 2026 NLV</p>
                    <p className="flex items-center gap-6">
                        <span>Fine print</span>
                        <LanguageSwitch variant="footer" />
                    </p>
                </div>
            </section>
        </Container>
    );
}
