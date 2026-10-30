<script lang="ts">
    import type { PageProps } from "./$types";
    import { getFormatter } from "$lib/i18n";
    import { enhance } from "$app/forms";
    import ConfirmModal from "$lib/components/modals/ConfirmModal.svelte";
    import Input from "$lib/components/Input.svelte";
    let { data, form }: PageProps = $props();
    const t = getFormatter();
</script>

<a class="m3-text-button m3-button mb-4" href="/account">{$t("admin.account")}</a>
{#if form?.message}<p class="text-invalid mb-4" role="alert">{form.message}</p>{/if}
<div class="grid gap-4 md:grid-cols-2">
    {#each data.memberships as membership (membership.id)}
        <section class="m3-card flex min-w-0 flex-col gap-4 p-5">
            <h2 class="m3-headline break-words">{membership.group.name}</h2>
            <div class="flex flex-wrap gap-3">
                {#if membership.canManage}
                    <a class="m3-secondary m3-button" href={`/admin/groups/${membership.group.id}`}>
                        {$t("general.manage-group")}
                    </a>
                {/if}
                <form id={`leave-${membership.id}`} action="?/leave" method="POST" use:enhance>
                    <input name="groupId" type="hidden" value={membership.group.id} />
                    <ConfirmModal
                        confirmButtonProps={{ type: "submit", form: `leave-${membership.id}` }}
                        confirmText={$t("groups.leave")}
                        description={$t("groups.leave-confirmation")}
                    >
                        {#snippet trigger(props)}
                            <button
                                {...props}
                                class="m3-text-button m3-button"
                                disabled={!membership.canLeave}
                                type="button"
                            >
                                {$t("groups.leave")}
                            </button>
                        {/snippet}
                    </ConfirmModal>
                </form>
            </div>
            {#if !membership.canLeave}<p class="subtext">{$t("groups.last-manager")}</p>{/if}
        </section>
    {/each}
</div>
<form id="create" class="m3-card mt-6 flex max-w-xl flex-col gap-4 p-5" action="?/create" method="POST" use:enhance>
    <h2 class="m3-headline">{$t("general.create-group")}</h2>
    <label class="m3-label">
        <span>{$t("admin.group-name")}</span>
        <Input name="name" maxlength={32} minlength={3} required />
    </label>
    <button class="m3-primary m3-button self-start" type="submit">{$t("general.create-group")}</button>
</form>
<svelte:head><title>{$t("admin.groups")}</title></svelte:head>
