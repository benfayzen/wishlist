<script lang="ts">
    import { enhance } from "$app/forms";
    import { page } from "$app/state";
    import Input from "$lib/components/Input.svelte";
    import ConfirmModal from "$lib/components/modals/ConfirmModal.svelte";
    import { toaster } from "$lib/components/toaster";
    import { getFormatter } from "$lib/i18n";
    import type { PageProps } from "./$types";

    const { data }: PageProps = $props();
    const t = getFormatter();
    let form = $derived(page.form);
</script>

<div class="m3-own-groups-shell">
    <div>
        <a class="m3-text-button m3-button w-fit" href="/account">
            <iconify-icon aria-hidden="true" icon="ion:arrow-back"></iconify-icon>
            <span>{$t("admin.account")}</span>
        </a>
    </div>

    <header class="flex flex-col gap-1">
        <h1 class="m3-page-title">{$t("admin.groups")}</h1>
    </header>

    <div class="m3-own-groups-grid">
        {#each data.groups as membership (membership.group.id)}
            <section class="m3-card m3-own-group-card">
                <div class="m3-own-group-header">
                    <div class="m3-list-card-icon shrink-0" aria-hidden="true">
                        <iconify-icon class="text-xl" icon="ion:people"></iconify-icon>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h2 class="m3-title truncate">{membership.group.name}</h2>
                        <div class="mt-1 flex flex-wrap gap-1.5">
                            {#if membership.isManager}
                                <span class="admin-role">{$t("general.manager")}</span>
                            {/if}
                            {#if membership.active}
                                <span class="admin-tag">{$t("general.active")}</span>
                            {/if}
                        </div>
                    </div>
                </div>

                {#if !membership.canLeave && membership.isManager}
                    <p class="subtext">{$t("errors.cannot-leave-as-last-manager")}</p>
                {/if}

                <div class={["m3-claim-actions mt-auto pt-2", membership.isManager && "m3-claim-split"]}>
                    {#if membership.isManager}
                        <a
                            class="m3-secondary m3-button m3-claim-button m3-claim-split-left"
                            href="/admin/groups/{membership.group.id}/members"
                        >
                            <iconify-icon aria-hidden="true" icon="ion:settings-outline"></iconify-icon>
                            <span>{$t("general.manage-group")}</span>
                        </a>
                    {/if}
                    <ConfirmModal
                        confirmButtonProps={{
                            type: "submit",
                            form: `leave-${membership.group.id}`,
                            class: "m3-danger m3-button m3-claim-button m3-claim-split-right"
                        }}
                        confirmText={$t("general.leave-group")}
                        description={$t("general.leave-group-confirmation", {
                            values: { groupName: membership.group.name }
                        })}
                        title={$t("general.please-confirm")}
                    >
                        {#snippet trigger(props)}
                            <button
                                {...props}
                                class={[
                                    "m3-button m3-claim-button",
                                    membership.isManager
                                        ? "m3-danger-tonal m3-claim-split-right"
                                        : "m3-danger-tonal w-full"
                                ]}
                                disabled={!membership.canLeave}
                                type="button"
                            >
                                <iconify-icon aria-hidden="true" icon="ion:exit-outline"></iconify-icon>
                                <span>{$t("general.leave-group")}</span>
                            </button>
                        {/snippet}
                    </ConfirmModal>
                </div>

                <form
                    id="leave-{membership.group.id}"
                    action="?/leave"
                    method="POST"
                    use:enhance={() => {
                        return async ({ result, update }) => {
                            if (result.type === "failure") {
                                toaster.error({
                                    description:
                                        (result.data?.error as string) || $t("errors.cannot-leave-as-last-manager")
                                });
                            }
                            await update();
                        };
                    }}
                >
                    <input name="groupId" type="hidden" value={membership.group.id} />
                </form>
            </section>
        {/each}
    </div>

    <form
        id="create"
        class="m3-card m3-own-group-create"
        action="?/create"
        method="POST"
        use:enhance={() => {
            return async ({ result, update }) => {
                if (result.type === "failure") {
                    toaster.error({ description: (result.data?.error as string) || $t("general.oops") });
                }
                await update();
            };
        }}
    >
        <div class="flex items-center gap-3">
            <div class="m3-list-card-icon shrink-0" aria-hidden="true">
                <iconify-icon class="text-xl" icon="ion:add-circle-outline"></iconify-icon>
            </div>
            <h2 class="m3-headline">{$t("general.create-group")}</h2>
        </div>
        <div class="m3-own-group-create-row">
            <div class="min-w-0 flex-1">
                <Input
                    id="group-name"
                    name="name"
                    autocomplete="off"
                    errors={form?.errors?.name}
                    icon="ion:people"
                    label={$t("general.group-name")}
                    required
                    value={form?.name ?? ""}
                />
            </div>
            <button class="m3-primary m3-button w-full sm:w-fit" type="submit">
                <iconify-icon aria-hidden="true" icon="ion:add"></iconify-icon>
                <span>{$t("general.create-group")}</span>
            </button>
        </div>
    </form>
</div>

<svelte:head>
    <title>{$t("admin.groups")}</title>
</svelte:head>
