/*
 * Typed message dictionaries. Each landing section keeps its static strings
 * (mockup labels, aria-labels, button text, form labels…: everything the
 * admin does not manage) in `i18n/sections/<section>.ts`:
 *
 *     export default defineMessages({
 *         en: { scanLabel: 'Scanning', tryOns: '{count} try-ons today' },
 *         ar: { scanLabel: 'جارٍ المسح', tryOns: '{count} تجربة اليوم' },
 *     });
 *
 * TypeScript enforces the pairing: `ar` must have exactly the keys of `en`
 * (a missing or an extra key is an error), and every `{placeholder}` in an
 * English string must appear in its Arabic string too.
 */

/** Names of the `{placeholders}` in a message: "{a} of {b}" → 'a' | 'b'. */
export type Placeholders<Message extends string> =
    Message extends `${string}{${infer Name}}${infer Rest}`
        ? Name | Placeholders<Rest>
        : never;

type UnionToIntersection<Union> = (
    Union extends unknown ? (value: Union) => void : never
) extends (value: infer Intersection) => void
    ? Intersection
    : never;

type Containing<Name extends string> = `${string}{${Name}}${string}`;

/**
 * What a translation of `Message` must look like: any string, or, when the
 * English has placeholders, a string containing each of them.
 */
export type Translation<Message extends string> = [
    Placeholders<Message>,
] extends [never]
    ? string
    : string &
          UnionToIntersection<
              Placeholders<Message> extends infer Name
                  ? Name extends string
                      ? Containing<Name>
                      : never
                  : never
          >;

/** One section's strings, English first. */
export type SectionMessages<En extends Record<string, string>> = {
    readonly en: En;
    readonly ar: { readonly [Key in keyof En]: string };
};

/**
 * Declares one section's strings in both languages. The English strings
 * keep their literal types, so `t()` knows every key and the placeholders
 * each message takes.
 */
export function defineMessages<
    const En extends Record<string, string>,
>(messages: {
    en: En;
    ar: { readonly [Key in keyof En]: Translation<En[Key]> };
}): SectionMessages<En> {
    return messages;
}
