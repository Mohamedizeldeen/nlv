import { Head, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { LandingDataProvider } from '@/components/landing/landing-data';
import { LandingLinksContext } from '@/components/landing/links';
import type { LandingLinks } from '@/components/landing/links';
import { OrderDialogProvider } from '@/components/landing/order-dialog';
import {
    Atmosphere,
    useAnchorGlide,
    usePauseOffscreenLoops,
} from '@/components/landing/primitives';
import Features from '@/components/landing/sections/features';
import FinalCta from '@/components/landing/sections/final-cta';
import Footer from '@/components/landing/sections/footer';
import Hero from '@/components/landing/sections/hero';
import HowItWorks from '@/components/landing/sections/how-it-works';
import Kiosk from '@/components/landing/sections/kiosk';
import Lookbook from '@/components/landing/sections/lookbook';
import Navbar from '@/components/landing/sections/navbar';
import Partners from '@/components/landing/sections/partners';
import Pricing from '@/components/landing/sections/pricing';
import Testimonials from '@/components/landing/sections/testimonials';
import { useDocumentLocale } from '@/hooks/use-i18n';
import { login } from '@/routes';
import { dashboard as adminDashboard } from '@/routes/admin';
import type { LandingData } from '@/types/landing';

export default function Welcome({ landing }: { landing: LandingData }) {
    const { auth } = usePage().props;
    // <html lang dir> for this page's language (/ or /ar).
    useDocumentLocale();
    // Taps on #anchors glide; looping decorations rest off screen.
    useAnchorGlide();
    usePauseOffscreenLoops();

    const links: LandingLinks = {
        signedIn: Boolean(auth.user),
        signIn: login(),
        admin: adminDashboard(),
    };

    // The landing page is always dark.
    useEffect(() => {
        const root = document.documentElement;
        root.classList.add('landing-page');

        return () => root.classList.remove('landing-page');
    }, []);

    return (
        <>
            <Head title={landing.content['seo.title']}>
                <meta
                    name="description"
                    content={landing.content['seo.description']}
                />
            </Head>
            <LandingDataProvider value={landing}>
                <OrderDialogProvider>
                    <LandingLinksContext value={links}>
                        <div className="landing relative isolate min-h-screen overflow-x-clip bg-ink font-sans text-bone antialiased">
                            <Atmosphere />
                            <Navbar />
                            <main>
                                <Hero />
                                <HowItWorks />
                                <Features />
                                <Kiosk />
                                <Lookbook />
                                <Partners />
                                <Testimonials />
                                <Pricing />
                                <FinalCta />
                            </main>
                            <Footer />
                        </div>
                    </LandingLinksContext>
                </OrderDialogProvider>
            </LandingDataProvider>
        </>
    );
}
