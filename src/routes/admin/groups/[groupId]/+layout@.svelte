<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import { page } from "$app/state";
    import { GroupAPI } from "$lib/api/groups";
    import Tabs from "$lib/components/Tabs.svelte";
    import type { LayoutProps } from "./$types";
    import { getFormatter } from "$lib/i18n";
    import { Role } from "$lib/schema";

    const { data, children }: LayoutProps = $props();
    const t = getFormatter();

    let editing = $state(false);
    let newGroupName: string | undefined = $state();
    const groupAPI = $derived(new GroupAPI(data.group.id));
    const backHref = $derived(page.data.user?.roleId === Role.ADMIN ? "/admin/groups" : "/account/groups");

    const saveGroupName = async () => {
        if (newGroupName) {
            await groupAPI.update({ name: newGroupName });
            editing = !editing;
            await invalidateAll();
        }
    };

    const tabs = $derived([
        { href: `/admin/groups/${data.group.id}/members`, label: $t("admin.members") },
        { href: `/admin/groups/${data.group.id}/settings`, label: $t("admin.settings") }
    ]);
</script>

<div class="admin-panel">
    <div class="mb-2">
        <a class="m3-text-button m3-button w-fit" href={backHref}>
            <iconify-icon aria-hidden="true" icon="ion:arrow-back"></iconify-icon>
            <span>{$t("admin.groups")}</span>
        </a>
    </div>

    <div class="admin-section-heading">
        <h1 class="h1">{$t("admin.group-settings")}</h1>
    </div>
    <div class="admin-group-heading">
        {#if editing}
            <div class="m3-field flex-1 grid-cols-[auto_1fr]">
                <div class="m3-field-slot">
                    <iconify-icon aria-hidden="true" icon="ion:people"></iconify-icon>
                </div>
                <input
                    id="group-name"
                    name="group-name"
                    class="m3-field-input"
                    placeholder={data.group.name}
                    title={$t("admin.group-name")}
                    type="text"
                    bind:value={newGroupName}
                />
            </div>
            <div class="m3-claim-actions m3-claim-split shrink-0">
                <button
                    class="m3-primary m3-button m3-icon-button m3-claim-split-left"
                    aria-label={$t("general.save")}
                    onclick={() => saveGroupName()}
                    type="button"
                >
                    <iconify-icon class="text-xl" aria-hidden="true" icon="ion:checkmark"></iconify-icon>
                </button>
                <button
                    class="m3-danger-tonal m3-button m3-icon-button m3-claim-split-right"
                    aria-label={$t("general.cancel")}
                    onclick={() => (editing = !editing)}
                    type="button"
                >
                    <iconify-icon class="text-xl" aria-hidden="true" icon="ion:close"></iconify-icon>
                </button>
            </div>
        {:else}
            <h2 class="h2">{data.group.name}</h2>
            <button
                class="m3-secondary m3-icon-button"
                aria-label={$t("a11y.edit-group-name")}
                onclick={() => (editing = !editing)}
                type="button"
            >
                <iconify-icon class="text-xl" aria-hidden="true" icon="ion:create-outline"></iconify-icon>
            </button>
        {/if}
    </div>

    <Tabs class="admin-group-tabs" {tabs} value={page.url.pathname}>
        {#snippet content()}
            <div class="admin-content">
                {@render children?.()}
            </div>
        {/snippet}
    </Tabs>
</div>

<svelte:head>
    <title>{$t("admin.group-settings")}</title>
</svelte:head>
