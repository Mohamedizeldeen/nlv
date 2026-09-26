/**
 * The kicker above a category's note: "Abayas · this week" (the name
 * alone without a suffix). The name is isolated, so an English name on the
 * Arabic page keeps its place before the suffix.
 */
export function CategoryKicker({
    name,
    suffix,
}: {
    name: string;
    suffix: string;
}) {
    return (
        <>
            <bdi>{name}</bdi>
            {suffix.trim() ? ` · ${suffix.trim()}` : null}
        </>
    );
}
