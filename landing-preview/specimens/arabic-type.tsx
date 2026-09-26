// Dev-only specimen: ?s=arabic-type&lang=ar (and without &lang for English).
// The landing's type styles set in the page's language, to check the Arabic
// faces, line heights, kickers, accents, italics and mixed figures.
import { ArrowRight } from 'lucide-react';
import { Accent } from '@/components/landing/accent';
import { Container, SectionHeader, cta } from '@/components/landing/primitives';
import { useI18n } from '@/hooks/use-i18n';

const COPY = {
    en: {
        kicker: 'In-store AI try-on',
        title: 'Every screen is a *fitting room.*',
        lede: 'TryOn is a touchscreen mirror for your shop floor. Shoppers see the coat, the abaya and the frames on themselves before they buy, without queueing for a fitting room.',
        primary: 'Order a device',
        secondary: 'Watch demo',
        points: ['Installed by our team', 'Cloud app included'],
        label: 'How it works',
        section: 'From the rail to *“it fits”* in four taps.',
        sectionLede:
            'No app, no measuring tape, no queue for the fitting room. Shoppers walk up to the mirror in your store.',
        today: 'try-ons today',
        metric: 'Abaya sales',
        range: 'sizes',
        quote: 'Installation took an afternoon. By the weekend the mirror was *the busiest corner of the shop.*',
        tagline: 'Try it on. Then buy it.',
    },
    ar: {
        kicker: 'التجربة الافتراضية داخل المتجر',
        title: 'كل شاشة *غرفة قياس*',
        lede: 'TryOn مرآة تعمل باللمس على أرض متجرك. ترى المتسوقة المعطف والعباءة والنظارة عليها قبل أن تشتري، دون انتظار دورها أمام غرفة القياس.',
        primary: 'اطلب جهازك',
        secondary: 'شاهد العرض',
        points: ['يركّبه فريقنا', 'التطبيق السحابي مشمول'],
        label: 'كيف يعمل',
        section: 'من الرف إلى *«تناسبني»* في أربع لمسات',
        sectionLede:
            'لا تطبيق ولا شريط قياس ولا طابور أمام غرفة القياس. تقف المتسوقة أمام المرآة في متجرك.',
        today: 'تجربة اليوم',
        metric: 'مبيعات العباءات',
        range: 'المقاسات',
        quote: 'استغرق التركيب ظهيرة واحدة. وبحلول نهاية الأسبوع صارت المرآة *أكثر أركان المتجر ازدحامًا.*',
        tagline: 'جرّبيها، ثم اشتريها.',
    },
} as const;

export default function ArabicTypeSpecimen() {
    const { locale, formatNumber } = useI18n();
    const copy = COPY[locale];

    return (
        <Container className="grid gap-20 py-20">
            <div className="grid gap-10 lg:grid-cols-12">
                <div className="glass-rim relative rounded-[32px] p-6 glass-strong sm:p-9 lg:col-span-7 lg:p-10">
                    <p className="text-kicker font-medium text-smoke uppercase">
                        {copy.kicker}
                    </p>
                    <h1 className="mt-6 font-display text-display-xl font-medium text-balance text-bone">
                        <Accent
                            text={copy.title}
                            className="font-normal text-mint"
                        />
                    </h1>
                    <p className="mt-6 max-w-[33rem] text-[17px] leading-relaxed text-pretty text-mist">
                        {copy.lede}
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <span
                            className={cta({ variant: 'primary', size: 'lg' })}
                        >
                            {copy.primary}
                            <ArrowRight
                                aria-hidden
                                className="size-4 rtl:-scale-x-100"
                            />
                        </span>
                        <span className={cta({ variant: 'glass', size: 'lg' })}>
                            {copy.secondary}
                        </span>
                    </div>
                    <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-smoke">
                        {copy.points.map((point) => (
                            <li key={point}>{point}</li>
                        ))}
                    </ul>
                </div>

                <div className="grid content-start gap-4 lg:col-span-5">
                    <div className="w-fit rounded-[14px] px-3.5 py-2 glass-thin">
                        <p className="text-[13px] leading-snug text-bone">
                            <span className="font-semibold tabular-nums">
                                {formatNumber(10284)}
                            </span>{' '}
                            {copy.today}
                        </p>
                    </div>
                    <div className="rounded-[24px] p-6 glass">
                        <p className="font-display text-[3.5rem] leading-none font-medium text-bone">
                            <span className="bidi-ltr">+33%</span>
                        </p>
                        <p className="mt-2 text-kicker text-mist uppercase">
                            {copy.metric}
                        </p>
                        <p className="mt-4 grid gap-1 text-sm text-smoke">
                            <span>
                                {copy.range} 52–60 · {copy.metric} +33%
                            </span>
                            <span className="text-mist">
                                {copy.range}{' '}
                                <span className="bidi-ltr">52–60</span> ·{' '}
                                {copy.metric}{' '}
                                <span className="bidi-ltr">+33%</span>
                            </span>
                        </p>
                    </div>
                    <p className="font-display text-[1.625rem] leading-[1.18] font-normal text-pretty text-bone italic">
                        <Accent
                            text={copy.quote}
                            className="text-mint not-italic"
                        />
                    </p>
                </div>
            </div>

            <SectionHeader
                index="01"
                label={copy.label}
                title={<Accent text={copy.section} />}
                lede={copy.sectionLede}
            />

            <p className="font-display text-[clamp(2.25rem,6.2vw,5.75rem)] leading-[0.95] font-normal tracking-[-0.02em] text-balance text-bone/[0.14] italic select-none">
                {copy.tagline}
            </p>
        </Container>
    );
}
