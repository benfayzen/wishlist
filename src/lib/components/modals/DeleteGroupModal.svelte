<script lang="ts">
    import { GroupAPI } from "$lib/api/groups";
    import { getFormatter } from "$lib/i18n";
    import { goto } from "$app/navigation";
    import AlertModal from "./AlertModal.svelte";
    import ConfirmModal from "./ConfirmModal.svelte";
    import { page } from "$app/state";
    import { Role } from "$lib/schema";

    interface Props {
        groupId: string;
        defaultGroup?: string | null;
    }

    const { groupId, defaultGroup }: Props = $props();

    const t = getFormatter();
    const groupAPI = $derived(new GroupAPI(groupId));
    const isDefaultGroup = $derived(defaultGroup === groupId);

    const onConfirm = async () => {
        const group = await groupAPI.delete();
        if (group) {
            goto(page.data.user?.roleId === Role.ADMIN ? "/admin/groups" : "/account/groups", { invalidateAll: true });
        }
    };
</script>

{#if isDefaultGroup}
    <AlertModal title={$t("errors.cannot-delete-default-group")}>
        {#snippet trigger(props)}
            <button {...props} class="m3-danger m3-button w-fit">{$t("admin.delete-group-title")}</button>
        {/snippet}
        {#snippet description()}
            {$t("general.cannot-delete-default-group-msg")}
        {/snippet}
    </AlertModal>
{:else}
    <ConfirmModal {onConfirm} title={$t("admin.delete-group-title")}>
        {#snippet trigger(props)}
            <button {...props} class="m3-danger m3-button w-fit">{$t("admin.delete-group-title")}</button>
        {/snippet}
        {#snippet description()}
            {@html $t("admin.delete-group-message")}
        {/snippet}
    </ConfirmModal>
{/if}
