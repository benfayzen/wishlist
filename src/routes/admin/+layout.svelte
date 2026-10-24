<script lang="ts">
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { Tabs } from "@skeletonlabs/skeleton-svelte";
    import type { LayoutProps, Snapshot } from "./$types";
    import { getFormatter } from "$lib/i18n";
    import { resolve } from "$app/paths";
    import Select from "$lib/components/Select.svelte";

    const { children }: LayoutProps = $props();
    const t = getFormatter();

    const tabs = {
        users: { href: resolve("/admin/users"), label: $t("admin.users") },
        groups: { href: resolve("/admin/groups"), label: $t("admin.groups") },
        settings: { href: resolve("/admin/settings"), label: $t("admin.settings") },
        actions: { href: resolve("/admin/actions"), label: $t("admin.actions") },
        about: { href: resolve("/admin/about"), label: $t("admin.about") }
    };

    type TabOption = keyof typeof tabs;

    let selectedTab: TabOption = $derived(
        (Object.keys(tabs) as TabOption[]).find((key) => page.url.pathname.startsWith(tabs[key].href)) ?? "users"
    );

    async function onValueChange(value: TabOption) {
        selectedTab = value;
        return goto(tabs[value].href, { replaceState: true });
    }

    export const snapshot: Snapshot = {
        capture: () => selectedTab,
        restore: (value) => (selectedTab = value)
    };
</script>

<div class="admin-panel">
    <div class="admin-mobile-navigation">
        <Select
            aria-label={$t("admin.administration")}
            onchange={(event) => onValueChange(event.currentTarget.value as TabOption)}
            value={selectedTab}
        >
            {#each Object.entries(tabs) as [value, { label }]}<option {value}>{label}</option>{/each}
        </Select>
    </div>
    <Tabs onValueChange={({ value }) => onValueChange(value as TabOption)} value={selectedTab}>
        <Tabs.List class="admin-tabs">
            {#each Object.entries(tabs) as [value, { label }]}
                <Tabs.Trigger {value}>
                    {label}
                </Tabs.Trigger>
            {/each}
            <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content class="admin-content" value={selectedTab}>
            {@render children?.()}
        </Tabs.Content>
    </Tabs>
</div>

<svelte:head>
    <title>{$t("admin.administration")}</title>
</svelte:head>
