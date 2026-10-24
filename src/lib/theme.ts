import {
    argbFromHex,
    hexFromArgb,
    Hct,
    TonalPalette,
    SchemeTonalSpot,
    DynamicScheme
} from "@material/material-color-utilities";

// Product colors drawn from wishlist-logo.png; Material generates the paired roles and tones.
export const DEFAULT_SEED = "#8b1fea";
const BRAND_COLORS = { primary: DEFAULT_SEED, secondary: "#9298e9", tertiary: "#f7bc2d" };
/** Only accept opaque six-digit colors; never interpolate stored CSS or URL parameters. */
export function validSeed(value: unknown): string {
    return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : DEFAULT_SEED;
}
const kebab = (value: string) => value.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
export function createTheme(seed: unknown = DEFAULT_SEED) {
    const color = validSeed(seed);
    const source = Hct.fromInt(argbFromHex(color));
    const scheme = (isDark: boolean) => {
        const base = new SchemeTonalSpot(source, isDark, 0);
        // Custom list colors retain their source-based palette; the default uses all three logo accents.
        if (color !== DEFAULT_SEED) return base;
        return new DynamicScheme({
            ...base,
            primaryPalette: TonalPalette.fromInt(argbFromHex(BRAND_COLORS.primary)),
            secondaryPalette: TonalPalette.fromInt(argbFromHex(BRAND_COLORS.secondary)),
            tertiaryPalette: TonalPalette.fromInt(argbFromHex(BRAND_COLORS.tertiary))
        });
    };
    return { light: scheme(false), dark: scheme(true) };
}
export function themeCss(seed: unknown = DEFAULT_SEED): string {
    const theme = createTheme(seed);
    return Object.entries(theme)
        .map(([mode, scheme]) => {
            const roles = [
                "primary",
                "onPrimary",
                "primaryContainer",
                "onPrimaryContainer",
                "secondary",
                "onSecondary",
                "secondaryContainer",
                "onSecondaryContainer",
                "tertiary",
                "onTertiary",
                "tertiaryContainer",
                "onTertiaryContainer",
                "surface",
                "onSurface",
                "surfaceVariant",
                "onSurfaceVariant",
                "surfaceContainerLowest",
                "surfaceContainerLow",
                "surfaceContainer",
                "surfaceContainerHigh",
                "surfaceContainerHighest",
                "outline",
                "outlineVariant",
                "error",
                "onError",
                "errorContainer",
                "onErrorContainer",
                "inverseSurface",
                "inverseOnSurface",
                "inversePrimary"
            ] as const;
            const values = roles.map((role) => `--md-${kebab(role)}:${hexFromArgb(scheme[role])}`);
            // Adapter for retained Skeleton behavioral components/presets. Their colors share the same HCT source.
            const palettes = {
                primary: scheme.primaryPalette,
                secondary: scheme.secondaryPalette,
                tertiary: scheme.tertiaryPalette,
                surface: scheme.neutralPalette,
                error: scheme.errorPalette,
                success: TonalPalette.fromHueAndChroma(145, 40),
                warning: TonalPalette.fromHueAndChroma(85, 40)
            };
            const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
            const tones = [98, 95, 90, 80, 70, 40, 35, 30, 25, 20, 10];
            for (const [name, palette] of Object.entries(palettes)) {
                for (let i = 0; i < steps.length; i++) {
                    const tone = tones[i];
                    const color = palette.tone(tone);
                    values.push(`--color-${name}-${steps[i]}:${hexFromArgb(color)}`);
                    values.push(`--color-${name}-contrast-${steps[i]}:${tone >= 60 ? "#17131d" : "#ffffff"}`);
                }
            }
            // Skeleton surfaces use inverted paired tokens in dark mode, independently of semantic M3 roles.
            values.push(`--color-surface-50:${hexFromArgb(scheme.neutralPalette.tone(98))}`);
            values.push(`--color-surface-950:${hexFromArgb(scheme.neutralPalette.tone(6))}`);
            values.push(`color-scheme:${mode}`);
            return `${mode === "light" ? ':root, [data-theme="wishlist"]' : '[data-mode="dark"], [data-theme="wishlist"][data-mode="dark"]'}{${values.join(";")}}`;
        })
        .join("\n");
}

/** Generated hex-only stylesheet; no user-supplied markup reaches this string. */
export const themeStyleTag = (seed: unknown) => `<style id="wishlist-context-theme">${themeCss(seed)}</style>`;
