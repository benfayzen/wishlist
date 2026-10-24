<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import { page } from "$app/state";
    import { GroupAPI } from "$lib/api/groups";
    import type { PageData, PageProps } from "./$types";
    import InviteUser from "$lib/components/admin/InviteUser.svelte";
    import ClearListsButton from "$lib/components/admin/Actions/ClearListsButton.svelte";
    import { enhance } from "$app/forms";
    import Alert from "$lib/components/Alert.svelte";
    import { getFormatter } from "$lib/i18n";
    import DeleteGroupModal from "$lib/components/modals/DeleteGroupModal.svelte";
    import ConfirmModal from "$lib/components/modals/ConfirmModal.svelte";
    import AddUserModal from "$lib/components/modals/AddUserModal.svelte";

    const { data }: PageProps = $props();
    const t = getFormatter();

    type UserData = PageData["group"]["users"][number];

    const groupAPI = $derived(new GroupAPI(data.group.id));
    const head = [$t("auth.name"), $t("auth.username"), $t("auth.email")];
    const dataKeys = ["name", "username", "email"] as (keyof UserData)[];

    const toggleManager = async (userId: string, isManager: boolean) => {
        if (isManager) await groupAPI.makeManager(userId);
        else await groupAPI.removeManager(userId);

        await invalidateAll();
    };

    const removeMember = async (userId: string) => {
        await groupAPI.removeMember(userId);
        await invalidateAll();
    };
</script>

{#snippet managerAction(user: UserData, compact = false)}
    {@const makeManager = !user.isGroupManager}
    <ConfirmModal
        onConfirm={() => toggleManager(user.id, makeManager)}
        title={$t("admin.add-remove-manager-title", { values: { isManager: makeManager } })}
    >
        {#snippet description()}
            {$t("admin.add-remove-manager-message", { values: { isManager: makeManager } })}
        {/snippet}
        {#snippet trigger(props)}
            <button
                class={compact ? "m3-secondary m3-button" : "m3-icon-button"}
                aria-label={`${$t("admin.manager")}: ${user.name}`}
                aria-pressed={user.isGroupManager}
                type="button"
                {...props}
            >
                <iconify-icon
                    aria-hidden="true"
                    icon={user.isGroupManager ? "ion:sparkles" : "ion:sparkles-outline"}
                ></iconify-icon>
                {#if compact}<span>{$t("admin.manager")}</span>{/if}
            </button>
        {/snippet}
    </ConfirmModal>
{/snippet}

{#snippet removeAction(user: UserData, compact = false)}
    <ConfirmModal onConfirm={() => removeMember(user.id)} title={$t("admin.remove-member-title")}>
        {#snippet description()}
            {@html $t("admin.remove-member-message")}
        {/snippet}
        {#snippet trigger(props)}
            <button
                class={compact ? "admin-remove-member m3-danger-tonal m3-button" : "m3-icon-button"}
                aria-label={$t("a11y.remove-user-from-group", { values: { user: user.name } })}
                type="button"
                {...props}
            >
                <iconify-icon class="text-error-500" aria-hidden="true" icon="ion:person-remove"></iconify-icon>
                {#if compact}<span>{$t("general.remove")}</span>{/if}
            </button>
        {/snippet}
    </ConfirmModal>
{/snippet}

<div class="admin-section-heading">
    <h3 class="m3-title">{$t("admin.members")}</h3>
    <span class="admin-count">{data.group.users.length}</span>
</div>

{#if data.config.listMode !== "registry"}
    <div class="admin-toolbar">
        <AddUserModal excludedUserIds={data.group.users.map(({ id }) => id)} groupId={data.group.id}>
            {#snippet trigger(props)}
                <button class="m3-primary m3-button" type="button" {...props}>
                    <iconify-icon aria-hidden="true" icon="ion:person-add"></iconify-icon>
                    <span>{$t("admin.add-member")}</span>
                </button>
            {/snippet}
        </AddUserModal>
        <form method="POST" use:enhance>
            <InviteUser config={data.config} defaultGroup={data.group} />
        </form>
    </div>
{:else}
    <Alert type="info">{@html $t("admin.registry-mode-alert-text")}</Alert>
{/if}

<ul class="admin-records admin-mobile-records" aria-label={$t("admin.members")}>
    {#each data.group.users as user (user.id)}
        <li class="admin-record">
            <div class="admin-record-heading">
                <div class="admin-identity">
                    <span class="admin-record-name">{user.name}</span>
                    <span class="admin-record-meta">@{user.username}</span>
                </div>
                {#if user.isGroupManager}<span class="admin-role">{$t("admin.manager")}</span>{/if}
            </div>
            {#if user.email}<span class="admin-record-meta">{user.email}</span>{/if}
            <div class="admin-member-actions">
                {@render managerAction(user, true)}
                {@render removeAction(user, true)}
            </div>
        </li>
    {/each}
</ul>

<div class="admin-desktop-table table-wrap preset-outlined-surface-200-800 rounded-container">
    <table class="table">
        <thead>
            <tr>
                {#each head as label}<th>{label}</th>{/each}
                <th>{$t("admin.manager")}</th>
                <th>{$t("general.remove")}</th>
            </tr>
        </thead>
        <tbody>
            {#each data.group.users as user (user.id)}
                <tr>
                    {#each dataKeys as key}<td>{user[key]}</td>{/each}
                    <td>{@render managerAction(user)}</td>
                    <td>{@render removeAction(user)}</td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

{#if data.group.users.length === 0}<p class="admin-empty">{$t("general.no-results")}</p>{/if}

<div class="admin-danger-actions">
    <DeleteGroupModal defaultGroup={data.config.defaultGroup} groupId={data.group.id} />
    <ClearListsButton groupId={page.params.groupId} />
    <ClearListsButton claimed groupId={page.params.groupId} />
</div>
