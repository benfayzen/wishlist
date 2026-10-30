<script lang="ts">
    import { Tabs as SkeletonTabs } from "@skeletonlabs/skeleton-svelte";
    import type { Snippet } from "svelte";
    import { goto } from "$app/navigation";

    interface TabItem {
        id?: string;
        href?: string;
        label: string;
    }

    interface Props {
        tabs: TabItem[];
        defaultValue?: string;
        value?: string;
        class?: string;
        content?: Snippet<[{ value: string }]>;
    }

    let { tabs, defaultValue, value = $bindable(), class: className, content }: Props = $props();

    const getInitialValue = () => {
        if (value) return value;
        if (typeof window !== "undefined" && window.location.hash) {
            const hash = window.location.hash.slice(1);
            if (tabs.some((t) => t.id === hash)) {
                return hash;
            }
        }
        return defaultValue ?? tabs[0]?.id ?? tabs[0]?.href ?? "";
    };

    let currentValue = $state(getInitialValue());

    $effect(() => {
        if (value !== undefined) {
            currentValue = value;
        }
    });

    $effect(() => {
        const onHashChange = () => {
            const hash = window.location.hash.slice(1);
            if (tabs.some((t) => t.id === hash)) {
                currentValue = hash;
                value = hash;
            }
        };
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    });

    const handleValueChange = (val: string) => {
        currentValue = val;
        value = val;
        const matched = tabs.find((t) => (t.id ?? t.href) === val);
        if (matched?.href) {
            goto(matched.href, { replaceState: true });
        }
    };
</script>

<SkeletonTabs class={className} onValueChange={(e) => handleValueChange(e.value)} value={currentValue}>
    <SkeletonTabs.List class="flex overflow-auto">
        {#each tabs as tab}
            {@const tabVal = tab.id ?? tab.href ?? ""}
            <SkeletonTabs.Trigger value={tabVal}>
                {tab.label}
            </SkeletonTabs.Trigger>
        {/each}
        <SkeletonTabs.Indicator />
    </SkeletonTabs.List>
    {#if content}
        {@render content({ value: currentValue })}
    {/if}
</SkeletonTabs>
