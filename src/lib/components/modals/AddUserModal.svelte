<script lang="ts">
    import { UsersAPI } from "$lib/api/users";
    import { getFormatter } from "$lib/i18n";
    import type { User } from "$lib/generated/prisma/client";
    import BaseModal, { type BaseModalProps as BaseProps } from "./BaseModal.svelte";
    import { GroupAPI } from "$lib/api/groups";
    import { invalidateAll } from "$app/navigation";
    import { debounce } from "$lib/util";
    import { Dialog } from "@skeletonlabs/skeleton-svelte";
    import { Listbox, useListCollection } from "@skeletonlabs/skeleton-svelte";

    interface Props extends Pick<BaseProps, "trigger"> {
        groupId: string;
        excludedUserIds: string[];
    }

    const { groupId, trigger, excludedUserIds }: Props = $props();
    const t = getFormatter();

    const groupAPI = $derived(new GroupAPI(groupId));
    const usersAPI = new UsersAPI();

    function resetForm() {
        searchValue = undefined;
        searchedUsers = [];
        selectedUser = undefined;
    }

    async function onFormSubmit() {
        if (selectedUser) {
            await groupAPI.addMember(selectedUser);
            await invalidateAll();
        }
        resetForm();
    }

    let searchedUsers: User[] = $state([]);
    let selectedUser: string | undefined = $state();
    let searchValue: string | undefined = $state();

    const doSearch = debounce(async (value: string | undefined) => {
        if (value) {
            searchedUsers = await usersAPI
                .search(value, { excludedUserIds })
                .then((resp) => resp.json() as unknown as User[]);
        } else {
            searchedUsers = [];
        }
    });

    const collection = $derived(
        useListCollection({
            items: searchedUsers,
            itemToValue(item) {
                return item.id;
            }
        })
    );
</script>

<BaseModal closeButtonLabel={$t("a11y.close")} title={$t("general.add-user")} {trigger}>
    {#snippet description()}
        {$t("general.search-for-user")}
    {/snippet}

    <Listbox {collection} onSelect={(e) => (selectedUser = e.value)}>
        <Listbox.Label class="text-base">{$t("general.search")}</Listbox.Label>
        <Listbox.Input>
            {#snippet element(props)}
                <div class="m3-field grid-cols-[auto_1fr]">
                    <div class="m3-field-slot">
                        <iconify-icon icon="ion:search"></iconify-icon>
                    </div>
                    <input
                        {...props}
                        class="m3-field-input"
                        oninput={(e) => doSearch(e.currentTarget.value)}
                        type="search"
                        bind:value={searchValue}
                    />
                </div>
            {/snippet}
        </Listbox.Input>
        <Listbox.Content class="pt-1">
            {#if collection.items.length === 0}
                <span class="px-2 pt-1">{$t("general.no-results")}</span>
            {/if}
            {#each collection.items as item (item.id)}
                <Listbox.Item {item}>
                    <Listbox.ItemText>
                        <span>{item.name}</span>
                        <span class="text-xs opacity-50">{item.username}</span>
                    </Listbox.ItemText>
                    <Listbox.ItemIndicator />
                </Listbox.Item>
            {/each}
        </Listbox.Content>
    </Listbox>

    {#snippet actions()}
        <div class="m3-claim-actions m3-claim-split m3-dialog-split-actions">
            <Dialog.CloseTrigger class="m3-secondary m3-button m3-claim-button m3-claim-split-left" onclick={resetForm}>
                {$t("general.cancel")}
            </Dialog.CloseTrigger>
            <Dialog.CloseTrigger
                class="m3-primary m3-button m3-claim-button m3-claim-split-right"
                onclick={onFormSubmit}
            >
                {$t("general.add-user")}
            </Dialog.CloseTrigger>
        </div>
    {/snippet}
</BaseModal>
