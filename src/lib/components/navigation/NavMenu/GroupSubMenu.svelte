<script lang="ts">
    import { getFormatter } from "$lib/i18n";
    let { groups, onSelect }: { groups: GroupInformation[] | null; onSelect: VoidFunction } = $props();
    const t = getFormatter();
    const managedGroups = $derived(groups?.filter((group) => group.isManager) ?? []);
</script>

<li>
    <a class="m3-account-action" href="/account/groups" onclick={onSelect}>
        <iconify-icon aria-hidden="true" icon="material-symbols:groups-outline-rounded"></iconify-icon>
        <span>{$t("admin.groups")}</span>
    </a>
</li>
{#each managedGroups as group (group.id)}
    <li>
        <a class="m3-account-action" href={`/admin/groups/${group.id}`} onclick={onSelect}>
            <iconify-icon aria-hidden="true" icon="material-symbols:settings-outline-rounded"></iconify-icon>
            <span>{$t("general.manage-group")}{managedGroups.length > 1 ? ` · ${group.name}` : ""}</span>
        </a>
    </li>
{/each}
<li>
    <a class="m3-account-action" href="/account/groups#create" onclick={onSelect}>
        <iconify-icon aria-hidden="true" icon="material-symbols:add-rounded"></iconify-icon>
        <span>{$t("general.create-group")}</span>
    </a>
</li>
