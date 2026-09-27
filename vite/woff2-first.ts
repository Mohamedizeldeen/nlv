import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

/*
 * One download per font face. Bunny serves each face as a WOFF2 file with a
 * WOFF fallback, in one @font-face rule. laravel-vite-plugin's fonts
 * (3.2) writes them back as two rules with the same family, style, weight
 * and unicode-range, and browsers then use the later one: every face came
 * as a WOFF, and a preloaded face was downloaded twice (its WOFF2 preload,
 * then the WOFF). woff2First() merges each pair back into one rule listing
 * the WOFF2 first: browsers download that file only, and one without WOFF2
 * support takes the WOFF. It rewrites the plugin's output (the built
 * fonts.css and fonts-manifest.json, the dev server's
 * public/fonts-manifest.dev.json) and does nothing once the plugin writes
 * one rule per face itself.
 */
const FONT_FACE = /@font-face\s*\{[^}]*\}/g;
const FONT_SRC = /^[ \t]*src:[^;]*;\n?/m;
const FONT_FORMATS = ['woff2', 'woff'];

function formatRank(source: string): number {
    const format = /format\(["']?([\w-]+)/.exec(source)?.[1] ?? '';
    const rank = FONT_FORMATS.indexOf(format);

    return rank === -1 ? FONT_FORMATS.length : rank;
}

/** Merges @font-face rules that differ only in their `src` (see above). */
function mergeFontFaces(css: string): string {
    const faceOf = (rule: string) => rule.replace(FONT_SRC, '');
    const sourceOf = (rule: string) =>
        /src:\s*([^;]*);/.exec(rule)?.[1].trim() ?? '';
    const sources = new Map<string, string[]>();

    for (const [rule] of css.matchAll(FONT_FACE)) {
        if (FONT_SRC.test(rule)) {
            const face = faceOf(rule);
            sources.set(face, [...(sources.get(face) ?? []), sourceOf(rule)]);
        }
    }

    const written = new Set<string>();

    return css
        .replace(FONT_FACE, (rule) => {
            const face = faceOf(rule);
            const list = sources.get(face) ?? [];

            if (list.length < 2) {
                return rule;
            }

            if (written.has(face)) {
                return '';
            }

            written.add(face);
            const src = [...list]
                .sort((a, b) => formatRank(a) - formatRank(b))
                .join(',\n    ');

            return rule.replace(/src:[^;]*;/, `src: ${src};`);
        })
        .replace(/\n{3,}/g, '\n\n');
}

type FontsManifest = {
    style?: { inline?: string; familyStyles?: Record<string, string> };
};

/** The same merge inside a fonts manifest's inline styles. */
function mergeManifestFontFaces(json: string): string {
    const manifest = JSON.parse(json) as FontsManifest;
    const style = manifest.style;

    if (style?.inline) {
        style.inline = mergeFontFaces(style.inline);
    }

    const families = style?.familyStyles ?? {};

    for (const [alias, css] of Object.entries(families)) {
        families[alias] = mergeFontFaces(css);
    }

    return JSON.stringify(manifest, null, 2);
}

type EmittedFile = Parameters<ThisParameterType<GenerateBundle>['emitFile']>[0];
type GenerateBundle = Extract<
    Plugin['generateBundle'],
    (...args: never[]) => unknown
>;

export function woff2First(plugins: Plugin[]): Plugin[] {
    const fonts = plugins.find((plugin) => plugin.name === 'laravel:fonts');
    const generateBundle = fonts?.generateBundle;
    const configureServer = fonts?.configureServer;

    if (
        !fonts ||
        typeof generateBundle !== 'function' ||
        typeof configureServer !== 'function'
    ) {
        console.warn(
            '[vite.config] laravel-vite-plugin changed its fonts plugin: each font face may be downloaded twice (WOFF2 and WOFF). See woff2First().',
        );

        return plugins;
    }

    // Build: rewrite fonts.css and fonts-manifest.json as they are emitted.
    fonts.generateBundle = function (...args) {
        const emitFile = (file: EmittedFile) => {
            if (file.type === 'asset' && typeof file.source === 'string') {
                if (file.name === 'fonts.css') {
                    file = { ...file, source: mergeFontFaces(file.source) };
                } else if (file.fileName === 'fonts-manifest.json') {
                    file = {
                        ...file,
                        source: mergeManifestFontFaces(file.source),
                    };
                }
            }

            return this.emitFile(file);
        };
        const context = new Proxy(this, {
            get: (target, key) => {
                if (key === 'emitFile') {
                    return emitFile;
                }

                const value: unknown = Reflect.get(target, key, target);

                return typeof value === 'function' ? value.bind(target) : value;
            },
        });

        return generateBundle.apply(context, args);
    };

    // Dev: rewrite public/fonts-manifest.dev.json once the plugin has
    // written it, when the server starts listening.
    fonts.configureServer = function (server: ViteDevServer) {
        const manifest = resolve(
            server.config.root,
            'public/fonts-manifest.dev.json',
        );
        const httpServer = server.httpServer;

        if (!httpServer) {
            return configureServer.call(this, server);
        }

        const rewrite = () => {
            if (existsSync(manifest)) {
                const json = readFileSync(manifest, 'utf-8');
                const merged = mergeManifestFontFaces(json);

                if (merged !== json) {
                    writeFileSync(manifest, merged);
                }
            }
        };
        const watched = new Proxy(httpServer, {
            get: (target, key) => {
                if (key === 'once') {
                    return (
                        event: string,
                        listener: (...args: unknown[]) => unknown,
                    ) =>
                        target.once(
                            event,
                            event === 'listening'
                                ? async (...args: unknown[]) => {
                                      await listener(...args);
                                      rewrite();
                                  }
                                : listener,
                        );
                }

                const value: unknown = Reflect.get(target, key, target);

                return typeof value === 'function' ? value.bind(target) : value;
            },
        });

        return configureServer.call(
            this,
            new Proxy(server, {
                get: (target, key) =>
                    key === 'httpServer'
                        ? watched
                        : Reflect.get(target, key, target),
            }),
        );
    };

    return plugins;
}
