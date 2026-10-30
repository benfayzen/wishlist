<script lang="ts">
    import { getFormatter } from "$lib/i18n";
    import { Dialog, Listbox, useListCollection } from "@skeletonlabs/skeleton-svelte";
    import BaseModal, { type BaseModalProps } from "./BaseModal.svelte";
    import type { Group } from "$lib/generated/prisma/client";
    import Popup from "../Popup.svelte";

    interface Props {
        trigger: BaseModalProps["trigger"];
        groups: Group[];
        defaultGroup?: Group;
        smtpEnabled: boolean;
        onSubmit?: (data: { group?: string; email?: string; method: InviteMethod }) => Promise<void> | void;
    }

    const { trigger, groups, defaultGroup, smtpEnabled, onSubmit }: Props = $props();
    const t = getFormatter();

    let open = $state(false);
    let userEmail: string | undefined = $state();
    let selectedGroup: string | undefined = $state(defaultGroup?.id);
    let emailError = $state(false);
    let groupError = $state(false);

    const onFormSubmit = async (method: InviteMethod) => {
        if (selectedGroup && (method === "link" || !smtpEnabled || userEmail)) {
            onSubmit?.({ group: selectedGroup, email: userEmail, method });
            resetForm();
            open = false;
        } else {
            open = true;
            emailError = smtpEnabled && !userEmail;
            groupError = !selectedGroup;
        }
    };

    const collection = $derived(
        useListCollection({
            items: groups,
            itemToString(item) {
                return item.name;
            },
            itemToValue(item) {
                return item.id;
            }
        })
    );

    function resetForm() {
        groupError = false;
        emailError = false;
        userEmail = undefined;
    }
</script>

<BaseModal
    closeButtonLabel={$t("a11y.close")}
    onOpenChange={(e) => (open = e.open)}
    {open}
    title={$t("general.invite-user")}
    {trigger}
>
    {#snippet description()}
        {#if smtpEnabled}
            <span>{$t("general.enter-user-email")}</span>
        {:else}
            <span>{$t("general.select-user-group")}</span>
        {/if}
    {/snippet}

    <div class="flex flex-col gap-2">
        {#if smtpEnabled}
            <label class="m3-label" for="invite-email">
                <span>{$t("auth.email")}</span>
                <div class={["m3-field grid-cols-[auto_1fr]", emailError && "m3-invalid"]}>
                    <div class="m3-field-slot">
                        <iconify-icon aria-hidden="true" icon="ion:mail"></iconify-icon>
                    </div>
                    <input
                        id="invite-email"
                        name="invite-email"
                        class="m3-field-input"
                        aria-invalid={emailError}
                        autocomplete="off"
                        required
                        type="email"
                        bind:value={userEmail}
                    />
                </div>
            </label>
            {#if emailError}
                <span class="text-invalid">Email is required</span>
            {/if}
        {/if}

        {#if groups && groups.length > 0}
            <Listbox aria-invalid={groupError} {collection} onSelect={(e) => (selectedGroup = e.value)}>
                <Listbox.Label class="text-base">{$t("general.group")}</Listbox.Label>
                <Listbox.Content class={["pt-3", groupError && "m3-invalid!"]}>
                    {#each collection.items as item (item.id)}
                        <Listbox.Item {item}>
                            <Listbox.ItemText>
                                {item.name}
                            </Listbox.ItemText>
                            <Listbox.ItemIndicator />
                        </Listbox.Item>
                    {/each}
                </Listbox.Content>
            </Listbox>
            {#if groupError}
                <span class="text-invalid">{$t("errors.must-select-a-group")}</span>
            {/if}
        {/if}
    </div>

    {#snippet actions()}
        <div class="m3-claim-actions m3-claim-split m3-dialog-split-actions">
            <Dialog.CloseTrigger class="m3-secondary m3-button m3-claim-button m3-claim-split-left" onclick={resetForm}>
                {$t("general.cancel")}
            </Dialog.CloseTrigger>
            {#if smtpEnabled}
                <Popup zIndex="z-60!">
                    {#snippet trigger(props)}
                        <button {...props} class="m3-primary m3-button m3-claim-button m3-claim-split-right">
                            {$t("auth.invite-via")}
                        </button>
                    {/snippet}
                    {#snippet content(props)}
                        <div {...props} class="m3-card p-4 shadow-xl">
                            <div class="flex flex-row gap-x-4">
                                <button class="m3-secondary m3-button" onclick={() => onFormSubmit("link")}>
                                    {$t("general.invite-link")}
                                </button>
                                <button class="m3-primary m3-button" onclick={() => onFormSubmit("email")}>
                                    {$t("auth.email")}
                                </button>
                            </div>
                        </div>
                    {/snippet}
                </Popup>
            {:else}
                <Dialog.CloseTrigger
                    class="m3-primary m3-button m3-claim-button m3-claim-split-right"
                    onclick={() => onFormSubmit("link")}
                >
                    {$t("general.invite")}
                </Dialog.CloseTrigger>
            {/if}
        </div>
    {/snippet}
</BaseModal>
