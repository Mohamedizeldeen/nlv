import { Head, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { BRAND } from '@/components/landing/brand';
import { LandingLinksContext } from '@/components/landing/links';
import type { LandingLinks } from '@/components/landing/links';
import { Atmosphere } from '@/components/landing/primitives';
import Features from '@/components/landing/sections/features';
import FinalCta from '@/components/landing/sections/final-cta';
import Footer from '@/components/landing/sections/footer';
import Hero from '@/components/landing/sections/hero';
import HowItWorks from '@/components/landing/sections/how-it-works';
import Integrations from '@/components/landing/sections/integrations';
import Kiosk from '@/components/landing/sections/kiosk';
import Lookbook from '@/components/landing/sections/lookbook';
import Navbar from '@/components/landing/sections/navbar';
import Partners from '@/components/landing/sections/partners';
import Pricing from '@/components/landing/sections/pricing';
import Testimonials from '@/components/landing/sections/testimonials';
import { dashboard, login } from '@/routes';
/* @chisel-registration */
import { register } from '@/routes';
/* @end-chisel-registration */

export default function Welcome() {
    const { auth } = usePage().props;

    const links: LandingLinks = {
        signedIn: Boolean(auth.user),
        signIn: login(),
        dashboard: dashboard(),
        /* @chisel-registration */
        signUp: register(),
        /* @end-chisel-registration */
    };

    // The landing page is always dark and scrolls smoothly to anchors.
    useEffect(() => {
        const root = document.documentElement;
        root.classList.add('landing-page');

        return () => root.classList.remove('landing-page');
    }, []);

    return (
        <>
            <Head title={`${BRAND.name}: AI virtual try-on for fashion retail`}>
                <meta
                    name="description"
                    content={`${BRAND.name} lets shoppers try on clothes and eyewear with AI, online and on an in-store kiosk. Built for fashion and eyewear retailers across the Gulf.`}
                />
            </Head>
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
                        <Integrations />
                        <FinalCta />
                    </main>
                    <Footer />
                </div>
            </LandingLinksContext>
        </>
    );
}
