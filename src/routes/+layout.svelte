<script lang="ts">
    import "../app.css";

    import { afterNavigate, beforeNavigate, replaceState } from "$app/navigation";
    import { page } from "$app/state";
    import { pwaInfo } from "virtual:pwa-info";

    import NavBar from "$lib/components/navigation/NavBar.svelte";
    import NavigationLoadingBar from "$lib/components/navigation/NavigationLoadingBar.svelte";
    import type { LayoutProps } from "./$types";
    import { onMount, tick } from "svelte";
    import NavigationRail from "$lib/components/navigation/NavigationRail.svelte";
    import BottomTabs from "$lib/components/navigation/BottomTabs.svelte";
    import { isInstalled } from "$lib/stores/is-installed";
    import PullToRefresh from "pulltorefreshjs";
    import { navItems } from "$lib/components/navigation/navigation";
    import { setFormatter, setLocale } from "$lib/i18n";
    import { themeStyleTag } from "$lib/theme";
    import Toaster from "$lib/components/toaster/Toaster.svelte";

    const { data, children }: LayoutProps = $props();

    const contextTheme = $derived(themeStyleTag(page.data.themeSeed));

    function updateBrowserThemeColor() {
        const color = getComputedStyle(document.documentElement).getPropertyValue("--md-surface-container").trim();
        const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
        if (color && meta && meta.content !== color) meta.content = color;
    }

    // The app preference can differ from the OS; follow the resolved mode used by the UI.
    onMount(() => {
        const observer = new MutationObserver(updateBrowserThemeColor);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] });
        updateBrowserThemeColor();
        return () => observer.disconnect();
    });

    $effect(() => {
        // Wait for the contextual stylesheet to update when navigating between lists.
        void contextTheme;
        void tick().then(updateBrowserThemeColor);
    });

    let showNavigationLoadingBar = $state(false);
    let documentTitle: string | undefined = $state();
    let disabled = $state(false);

    const titleDisabledUrls = [
        "/login",
        "/signup",
        /^\/$/,
        "/forgot-password",
        "/reset-password",
        "/group-error",
        /\/setup-wizard\/?.*/
    ];

    setFormatter(data.t);
    setLocale(data.locale);

    const scrollPositions = new Map<string, { top: number; left: number }>();
    let scrollId = "";

    beforeNavigate(() => {
        const content = document.getElementById("main");
        if (scrollId && content) {
            scrollPositions.set(scrollId, { top: content.scrollTop, left: content.scrollLeft });
        }
        showNavigationLoadingBar = true;
    });

    afterNavigate((params) => {
        showNavigationLoadingBar = false;
        documentTitle = document?.title;
        disabled = titleDisabledUrls.find((url) => page.url.pathname.match(url)) !== undefined;
        const content = document.getElementById("main");
        scrollId = page.state.wishlistScrollId || crypto.randomUUID();
        if (!page.state.wishlistScrollId) {
            tick().then(() => {
                replaceState(page.url, { ...page.state, wishlistScrollId: scrollId });
            });
        }
        const saved = scrollPositions.get(scrollId);
        if (params.type === "popstate" && saved) {
            content?.scrollTo({ ...saved, behavior: "instant" });
        } else if (params.type !== "popstate" && params.to?.url.pathname !== params.from?.url.pathname) {
            if (page.url.hash) {
                document.getElementById(decodeURIComponent(page.url.hash.slice(1)))?.scrollIntoView();
            } else {
                content?.scrollTo({ top: 0, left: 0, behavior: "instant" });
            }
        }
    });

    let shouldPullToRefresh = $state(true);
    onMount(() => {
        if (window.matchMedia("(display-mode: standalone)").matches) {
            $isInstalled = true;

            // don't PTR inside of dialogs
            document.body.addEventListener("touchstart", (ev) => {
                let el = ev.target as HTMLElement | null;
                while (el && el.parentNode && el !== document.body) {
                    if (el.scrollTop > 0) {
                        shouldPullToRefresh = false;
                    }
                    if (el.getAttribute("role") === "dialog") {
                        shouldPullToRefresh = false;
                        break;
                    }
                    el = el.parentNode as HTMLElement;
                }
            });
            document.body.addEventListener("touchend", () => {
                shouldPullToRefresh = true;
            });
            const content = document.getElementById("main")!;
            const ptr = PullToRefresh.init({
                mainElement: content as unknown as string,
                distThreshold: 70,
                resistanceFunction: (t) => Math.min(1, t / 4.5),
                onRefresh() {
                    window.location.reload();
                },
                shouldPullToRefresh: () => content.scrollTop === 0 && shouldPullToRefresh
            });
            return () => ptr.destroy();
        }
    });

    onMount(async () => {
        if (pwaInfo) {
            const { registerSW } = await import("virtual:pwa-register");
            registerSW({
                immediate: true,
                onRegistered(r) {
                    console.log(`SW Registered: ${r}`);
                },
                onRegisterError(error) {
                    console.log("SW registration error", error);
                }
            });
        }
    });

    // Keep the header in sync when a list name or the language changes without navigation.
    onMount(() => {
        const updateTitle = () => (documentTitle = document.title);
        const observer = new MutationObserver(updateTitle);
        observer.observe(document.head, { childList: true, subtree: true, characterData: true });
        updateTitle();
        return () => observer.disconnect();
    });

    const webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : "");

    let railExpanded = $state(false);
</script>

<div class="m3-app-shell" class:has-navigation={!!data.user} class:rail-expanded={railExpanded}>
    {#if data.user}
        <NavigationRail {navItems} user={data.user} bind:expanded={railExpanded} />
    {/if}
    <header class="m3-app-header z-15 print:hidden">
        {#if showNavigationLoadingBar}
            <NavigationLoadingBar />
        {/if}
        <NavBar
            groups={data.groups}
            isProxyUser={data.isProxyUser}
            title={disabled ? undefined : documentTitle}
            user={data.user}
        />
    </header>

    <div class="m3-content-pane">
        <main id="main" class="m3-pane-scroll" tabindex="-1">
            <div class="app-main">
                {#if !disabled && documentTitle}
                    <h1 class="m3-page-title hidden pb-2 print:block">{documentTitle}</h1>
                {/if}
                {@render children?.()}
            </div>
        </main>
    </div>

    <footer class="m3-navigation-footer print:hidden">
        <BottomTabs {navItems} user={data.user} />
    </footer>
</div>

<Toaster />

<svelte:head>
    {@html webManifestLink}
    {@html contextTheme}
</svelte:head>
