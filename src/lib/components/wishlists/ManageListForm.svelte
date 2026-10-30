<script lang="ts">
    import FormSection from "../FormSection.svelte";
    import ListCard from "$lib/components/ListCard.svelte";
    import IconSelector from "$lib/components/IconSelector.svelte";
    import { enhance } from "$app/forms";
    import ClearableInput from "$lib/components/ClearableInput.svelte";
    import type { List, User } from "$lib/generated/prisma/client";
    import { getFormatter } from "$lib/i18n";
    import MarkdownEditor from "../MarkdownEditor.svelte";
    import { page } from "$app/state";
    import Tooltip from "../Tooltip.svelte";
    import ConfirmModal from "../modals/ConfirmModal.svelte";
    import SelectListManagerModal from "../modals/SelectListManagerModal.svelte";
    import { validSeed, DEFAULT_SEED } from "$lib/theme";
    import Checkbox from "../Checkbox.svelte";
    import FieldShell from "../FieldShell.svelte";
    import AdaptivePicker from "../AdaptivePicker.svelte";

    interface ListProps extends Partial<
        Pick<
            List,
            | "id"
            | "icon"
            | "iconColor"
            | "name"
            | "public"
            | "description"
            | "hideOwner"
            | "allowSelfClaims"
            | "notForMe"
        >
    > {
        owner: Pick<User, "id" | "name" | "username" | "picture">;
        managers: Pick<User, "id" | "name" | "username">[];
    }

    interface Props {
        list: ListProps;
        persistButtonName: string;
        listMode: ListMode;
        allowsPublicLists: boolean;
        claimsVisibleToOwner: boolean;
        groupId: string;
        editing?: boolean;
        groupOptions?: { id: string; name: string }[];
        selectedGroupIds?: string[];
        groupPolicies?: { id: string; listMode: ListMode; allowsPublicLists: boolean; claimsVisibleToOwner: boolean }[];
    }

    const {
        list: list_,
        persistButtonName,
        listMode: fallbackListMode,
        allowsPublicLists: fallbackPublicLists,
        claimsVisibleToOwner: fallbackOwnerClaims,
        groupId: fallbackGroupId,
        editing = false,
        groupOptions = [],
        selectedGroupIds = [],
        groupPolicies = []
    }: Props = $props();
    const t = getFormatter();
    const formId: string = $props.id();
    let groupsOpen = $state(false);
    // svelte-ignore state_referenced_locally
    let groups = $state([...selectedGroupIds]);
    const groupId = $derived(editing ? fallbackGroupId : (groups[0] ?? fallbackGroupId));
    const policy = $derived(editing ? undefined : groupPolicies.find((policy) => policy.id === groupId));
    const listMode = $derived(policy?.listMode ?? fallbackListMode);
    const allowsPublicLists = $derived(policy?.allowsPublicLists ?? fallbackPublicLists);
    const claimsVisibleToOwner = $derived(policy?.claimsVisibleToOwner ?? fallbackOwnerClaims);
    const lockedGroups = $derived(selectedGroupIds.filter((id) => !groupOptions.some((group) => group.id === id)));

    // svelte-ignore state_referenced_locally
    let list = $state(list_);
    const defaultColor = DEFAULT_SEED;
    let colorValue = $state(validSeed(list.iconColor));
    let managers = $derived(list.managers);

    const removeManager = (id: string) => {
        managers = managers.filter((user) => user.id !== id);
    };

    $effect(() => {
        if (!colorValue) colorValue = defaultColor;
    });
</script>

<form
    id={formId}
    action="?/persist"
    method="POST"
    use:enhance={async (e) => {
        if (e.formData.get("iconColor") === defaultColor) {
            e.formData.delete("iconColor");
        }
    }}
>
    <input name="groupsProvided" type="hidden" value="1" />
    <div class="m3-form-surface">
        <FormSection title={$t("ui.list-identity")}>
            <div class="grid grid-cols-12 gap-5">
                <div class="col-span-full flex w-full flex-row flex-wrap gap-4">
                    <label class="m3-label w-fit grow" for="name">
                        <span>{$t("auth.name")}</span>
                        <ClearableInput
                            id="name"
                            name="name"
                            autocomplete="off"
                            clearButtonLabel={$t("a11y.clear-name-field")}
                            onValueClear={() => (list.name = null)}
                            placeholder={$t("wishes.wishes-for", { values: { listOwner: list.owner.name } })}
                            showClearButton={() => list.name !== null}
                            type="text"
                            bind:value={list.name}
                        />
                    </label>
                </div>

                <div class="m3-label col-span-full md:col-span-4">
                    <label for="iconColor">{$t("general.icon-bg-color")}</label>
                    <FieldShell class="m3-color-field">
                        {#snippet leading()}
                            <input
                                id="iconColor"
                                name="iconColor"
                                class="m3-color-swatch"
                                oninput={(e) => (list.iconColor = e.currentTarget.value)}
                                type="color"
                                bind:value={colorValue}
                            />
                        {/snippet}
                        <output class="m3-field-input" for="iconColor">{colorValue}</output>
                        {#snippet trailing()}
                            {#if colorValue !== defaultColor}
                                <button
                                    class="m3-field-slot"
                                    aria-label={$t("a11y.clear-color-field")}
                                    onclick={() => {
                                        colorValue = defaultColor;
                                        list.iconColor = defaultColor;
                                    }}
                                    type="button"
                                >
                                    <iconify-icon aria-hidden="true" icon="ion:close-circle"></iconify-icon>
                                </button>
                            {/if}
                        {/snippet}
                    </FieldShell>
                </div>
                <div class="col-span-full md:col-span-8">
                    <IconSelector id="icon" icon={list.icon} onIconSelected={(icon) => (list.icon = icon)} />
                </div>
            </div>
        </FormSection>
        <FormSection title={$t("ui.list-sharing")}>
            <div class="grid grid-cols-12 gap-5">
                <fieldset class="col-span-full min-w-0">
                    <legend class="m3-label mb-2">{$t("wishes.visible-in-groups")}</legend>
                    <AdaptivePicker label={$t("wishes.visible-in-groups")} bind:open={groupsOpen}>
                        {#snippet trigger(props)}
                            <button {...props} class="m3-secondary m3-button max-w-full" type="button">
                                <iconify-icon aria-hidden="true" icon="ion:people"></iconify-icon>
                                <span class="truncate">{$t("wishes.select-groups")} ({groups.length})</span>
                            </button>
                        {/snippet}
                        <div class="m3-choice-list max-h-72 overflow-auto" data-testid="list-group-options">
                            {#each groupOptions as group (group.id)}
                                <Checkbox
                                    checked={groups.includes(group.id)}
                                    onchange={(event) => {
                                        groups = event.currentTarget.checked
                                            ? [...groups, group.id]
                                            : groups.filter((id) => id !== group.id);
                                    }}
                                >
                                    <span>{group.name}</span>
                                </Checkbox>
                            {/each}
                        </div>
                    </AdaptivePicker>
                    <p class="subtext mt-2">
                        {groupOptions
                            .filter((group) => groups.includes(group.id))
                            .map((group) => group.name)
                            .join(", ")}
                    </p>
                    <p class="subtext mt-2">{$t("wishes.shared-groups-description")}</p>
                    {#each [...new Set([...groups, ...lockedGroups])] as groupId (groupId)}
                        <input name="groups" type="hidden" value={groupId} />
                    {/each}
                </fieldset>
                {#if allowsPublicLists || listMode === "registry"}
                    <div class="col-span-full">
                        <Checkbox
                            name="public"
                            checked={list.public || listMode === "registry"}
                            disabled={listMode === "registry"}
                        >
                            <span>{$t("wishes.public")}</span>
                            {#snippet description()}
                                {$t("wishes.public-list-option-description")}
                            {/snippet}
                        </Checkbox>
                    </div>
                {/if}

                <div class="col-span-full">
                    <Checkbox name="hideOwner" bind:checked={list.hideOwner}>
                        <span>{$t("wishes.hide-owner")}</span>
                        {#snippet description()}
                            {$t("wishes.list-hide-owner-description")}
                        {/snippet}
                    </Checkbox>
                </div>

                <div class="col-span-full">
                    <Checkbox name="notForMe" bind:checked={list.notForMe}>
                        <span>{$t("wishes.list-not-for-me")}</span>
                        {#snippet description()}
                            <span>
                                {$t("wishes.list-not-for-me-description")}
                            </span>
                        {/snippet}
                    </Checkbox>
                </div>

                <div class="col-span-full">
                    <Checkbox
                        name="allowSelfClaims"
                        disabled={!claimsVisibleToOwner || list.notForMe}
                        bind:checked={list.allowSelfClaims}
                    >
                        <span>{$t("wishes.list-allow-self-claims")}</span>
                        {#snippet description()}
                            <span>{$t("wishes.list-allow-self-claims-description")}</span>
                            {#if !claimsVisibleToOwner}
                                <span class="text-invalid italic">
                                    {$t("wishes.list-allow-self-claims-description-helper-text")}
                                </span>
                            {/if}
                        {/snippet}
                    </Checkbox>
                </div>
            </div>
        </FormSection>
        <FormSection title={$t("ui.list-management")}>
            <div class="grid grid-cols-12 gap-5">
                <div class="col-span-full">
                    <label class="m3-label mb-1" for="description">
                        <span>{$t("general.description")}</span>
                    </label>
                    <MarkdownEditor
                        id="description"
                        name="description"
                        placeholder={$t("general.add-a-description")}
                        value={list.description}
                    />
                </div>

                <fieldset
                    class="col-span-full flex min-w-0 flex-col space-y-2 md:col-span-5"
                    aria-labelledby="list-managers-label"
                >
                    <div class="flex items-end justify-between">
                        <Tooltip iconClass="mt-0.5">
                            {#snippet label()}
                                <legend id="list-managers-label">{$t("wishes.list-managers")}</legend>
                            {/snippet}
                            {#snippet description()}
                                <p>{$t("wishes.list-managers-tooltip")}</p>
                            {/snippet}
                        </Tooltip>

                        <SelectListManagerModal
                            {groupId}
                            managers={[list.owner, ...managers]}
                            onSubmit={(newManager) => (managers = [...managers, newManager])}
                        >
                            {#snippet trigger(props)}
                                <button {...props} class="m3-secondary m3-button m3-button-small" type="button">
                                    {$t("wishes.add-a-manager")}
                                </button>
                            {/snippet}
                        </SelectListManagerModal>
                    </div>

                    <div
                        class={["m3-choice-list", page.form?.errors?.managers && "m3-invalid!"]}
                        data-testid="list-managers-list"
                    >
                        {#if managers.length === 0}
                            <span class="subtext">{$t("wishes.no-managers")}</span>
                        {/if}
                        {#each managers as manager (manager.id)}
                            <label class="flex items-center justify-between" for={manager.id}>
                                <div class="flex items-baseline gap-x-2 truncate">
                                    <p class="truncate" data-part="name">{manager.name}</p>
                                    <span class="subtext truncate" data-part="email">{manager.username}</span>
                                </div>
                                <button
                                    class="flex items-center"
                                    onclick={() => removeManager(manager.id)}
                                    type="button"
                                >
                                    <iconify-icon icon="ion:close"></iconify-icon>
                                    <span class="sr-only">
                                        {$t("a11y.remove-manager-name", { values: { name: manager.name } })}
                                    </span>
                                </button>
                            </label>
                            <input
                                id={manager.id}
                                name="managers"
                                class="hidden"
                                readonly
                                type="text"
                                value={manager.id}
                            />
                        {/each}
                    </div>
                    {#if page.form?.errors?.managers}
                        <p class="text-invalid">{page.form.errors.managers[0]}</p>
                    {/if}
                </fieldset>

                <div class="col-span-full">
                    <div class="flex flex-col space-y-2">
                        <span>{$t("wishes.preview")}</span>
                        <ListCard hideCount {list} preventNavigate />
                    </div>
                </div>
            </div>
        </FormSection>
    </div>

    <div class="m3-form-actions m3-form-surface">
        <button class="m3-text-button m3-button" onclick={() => history.back()} type="button">
            {$t("general.cancel")}
        </button>
        <div>
            {#if editing}
                <ConfirmModal
                    confirmButtonProps={{ type: "submit", form: formId, formaction: "?/delete" }}
                    description={$t("wishes.delete-list-confirmation")}
                >
                    {#snippet trigger(props)}
                        <button {...props} class="m3-danger m3-button">
                            {$t("wishes.delete")}
                        </button>
                    {/snippet}
                </ConfirmModal>
            {/if}
            <button class="m3-primary m3-button" type="submit">
                {persistButtonName}
            </button>
        </div>
    </div>
</form>
