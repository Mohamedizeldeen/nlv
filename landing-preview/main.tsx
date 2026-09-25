// TEMPORARY dev-only harness: http://localhost:5173/landing-preview/index.html?s=hero,pricing
import { Component, StrictMode, Suspense, lazy } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../resources/css/app.css';
import { Atmosphere } from '@/components/landing/primitives';

const modules = import.meta.glob<{ default: ComponentType }>(
    '../resources/js/components/landing/sections/*.tsx',
);
const names = (new URLSearchParams(location.search).get('s') ?? '')
    .split(',')
    .filter(Boolean);
const sections = names.map((name) => {
    const loader =
        modules[`../resources/js/components/landing/sections/${name}.tsx`];

    return { name, Section: loader ? lazy(loader) : null };
});

class Boundary extends Component<
    { name: string; children: ReactNode },
    { error: Error | null }
> {
    state = { error: null as Error | null };

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    render() {
        if (this.state.error) {
            return (
                <pre
                    data-preview-error
                    style={{
                        color: '#f88',
                        padding: 24,
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    {this.props.name}: {String(this.state.error.stack)}
                </pre>
            );
        }

        return this.props.children;
    }
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <div className="landing relative isolate min-h-screen overflow-x-clip bg-ink font-sans text-bone antialiased">
            <Atmosphere />
            {sections.map(({ name, Section }) => (
                <Boundary key={name} name={name}>
                    <Suspense fallback={null}>
                        {Section ? <Section /> : <p>Unknown section: {name}</p>}
                    </Suspense>
                </Boundary>
            ))}
        </div>
    </StrictMode>,
);
