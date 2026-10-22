<script lang="ts">
    import { applyAction, enhance } from "$app/forms";
    import ItemForm from "$lib/components/wishlists/ItemForm.svelte";
    import type { Item } from "$lib/generated/prisma/client";
    import type { PageProps } from "./$types";
    import { getFormatter } from "$lib/i18n";
    import { toaster } from "$lib/components/toaster";
    import { goto, replaceState } from "$app/navigation";
    import { page } from "$app/state";
    import Alert from "$lib/components/Alert.svelte";

    const { data }: PageProps = $props();
    const t = getFormatter();

    let itemData: Pick<Item, "name" | "price" | "url" | "note" | "imageUrl"> = $state({
        name: "",
        price: null,
        url: null,
        note: null,
        imageUrl: null
    });

    let formVersion = $state(0);

    let warningHidden = $state(false);
    let saving = $state(false);
    let createdAnother = $state(false);

    const clearFields = () => {
        const nextUrl = new URL(page.url);
        nextUrl.searchParams.delete("productUrl");
        replaceState(nextUrl, page.state);
        itemData = { name: "", price: null, url: null, note: null, imageUrl: null };
        formVersion += 1;
    };
</script>

{#if data.suggestion && data.suggestionMethod === "approval" && !warningHidden}
    <Alert title={$t("wishes.heads-up")} type="info">
        {$t("wishes.approval-required", { values: { listOwner: data.list.owner.name } })}
        {#snippet actions(variant)}
            <button class={["m3-button m3-button-small", variant]} onclick={() => (warningHidden = true)}>
                {$t("general.ok")}
            </button>
        {/snippet}
    </Alert>
{/if}

<p role="status">
    {#if createdAnother}{$t("wishes.item-created")}{/if}
</p>

<form
    enctype="multipart/form-data"
    method="POST"
    use:enhance={({ submitter }) => {
        saving = true;
        createdAnother = false;
        return async ({ result }) => {
            saving = false;
            if (result.type === "error") {
                toaster.error({ description: (result.error?.message as string) || $t("general.oops") });
                return;
            }
            if (result.type === "redirect") {
                toaster.info({ description: $t("wishes.item-created") });

                if (submitter?.id === "submit-stay") {
                    clearFields();
                    createdAnother = true;
                    document.getElementById("main")?.scrollTo({ top: 0 });
                    return;
                }
                return goto(result.location, { invalidateAll: true, replaceState: true });
            }
            await applyAction(result);
        };
    }}
>
    {#key formVersion}
        <ItemForm
            buttonText={$t("wishes.add-item")}
            currentList={data.list.id}
            item={itemData}
            lists={data.lists}
            productUrl={formVersion === 0 ? page.url.searchParams.get("productUrl") : null}
            {saving}
            userId={data.user.id}
        />
    {/key}
</form>

<svelte:head>
    {#if data.list.owner.isMe}
        <title>{$t("wishes.create")}</title>
    {:else}
        <title>{$t("wishes.create-for", { values: { listOwner: data.list.owner.name } })}</title>
    {/if}
</svelte:head>
