<script lang="ts">
    import { goto, invalidateAll } from "$app/navigation";
    import Search from "../Search.svelte";
    import { GroupsAPI } from "$lib/api/groups";
    import { getFormatter } from "$lib/i18n";
    import { toaster } from "../toaster";
    import PromptModal from "../modals/PromptModal.svelte";

    type Group = {
        id: string;
        name: string;
        userCount: number;
    };

    interface Props {
        groups: Group[];
    }

    const { groups }: Props = $props();
    const t = getFormatter();

    const headers = [$t("auth.name"), $t("general.user-count")];

    let groupsFiltered: Group[] = $derived(groups);

    const selectionHandler = (group: Group) => {
        goto(`/admin/groups/${group.id}`);
    };

    const createGroup = async (name: string | undefined) => {
        if (!name) {
            return;
        }
        const groupsAPI = new GroupsAPI();
        const group = await groupsAPI.create(name);
        if (group) {
            toaster.info({
                description: $t("general.group-created-successfully")
            });
        } else {
            toaster.error({
                description: $t("errors.create-group-unknown-error")
            });
        }
        await invalidateAll();
    };
</script>

<div class="admin-section-heading">
    <h2 class="m3-headline">{$t("admin.groups")}</h2>
    <span class="admin-count">{groupsFiltered.length}</span>
</div>

<div class="admin-toolbar">
    <Search data={groups} keys={["name"]} bind:result={groupsFiltered} />
    <PromptModal
        description={$t("general.provide-the-name-of-the-group-below")}
        inputProps={{ type: "text", minlength: 3, maxlength: 32, required: true }}
        onSubmit={createGroup}
        title={$t("general.enter-group-name")}
    >
        {#snippet trigger(props)}
            <button class="m3-primary m3-button" {...props}>
                <iconify-icon icon="ion:add"></iconify-icon>
                <p>{$t("general.create-group")}</p>
            </button>
        {/snippet}
    </PromptModal>
</div>

<ul class="admin-records admin-mobile-records" aria-label={$t("admin.groups")}>
    {#each groupsFiltered as group (group.id)}
        <li>
            <a class="admin-record admin-record-link" href={`/admin/groups/${group.id}`}>
                <div class="admin-record-heading">
                    <div class="admin-identity">
                        <span class="admin-record-name">{group.name}</span>
                        <span class="admin-record-meta">{$t("general.user-count")}: {group.userCount}</span>
                    </div>
                    <iconify-icon aria-hidden="true" icon="ion:chevron-forward"></iconify-icon>
                </div>
            </a>
        </li>
    {/each}
</ul>

<div class="admin-desktop-table m3-table-wrapper table-wrap">
    <table class="table-hover table table-auto">
        <thead>
            <tr>
                {#each headers as header}
                    <th>{header}</th>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each groupsFiltered as group}
                <tr onclick={() => selectionHandler(group)}>
                    <td>
                        <a
                            class="anchor"
                            href={`/admin/groups/${group.id}`}
                            onclick={(event) => event.stopPropagation()}
                        >
                            {group.name}
                        </a>
                    </td>
                    <td>{group.userCount}</td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

{#if groupsFiltered.length === 0}<p class="admin-empty" role="status">{$t("general.no-results")}</p>{/if}
