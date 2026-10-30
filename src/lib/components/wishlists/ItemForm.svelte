<script lang="ts">
    import { page } from "$app/state";
    import type { Group, Item, ItemPrice, List, User } from "$lib/generated/prisma/client";
    import SplitSubmitButton from "$lib/components/SplitSubmitButton.svelte";
    import { getDefaultCurrency, getPriceValue } from "$lib/price-formatter";
    import FormSection from "../FormSection.svelte";
    import CurrencyInput from "../CurrencyInput.svelte";
    import { onMount } from "svelte";
    import { getFormatter } from "$lib/i18n";
    import { goto } from "$app/navigation";
    import MarkdownEditor from "../MarkdownEditor.svelte";
    import FileUpload from "../FileUpload.svelte";
    import { toaster } from "../toaster";

    interface ListProps extends Pick<List, "id" | "name" | "public"> {
        owner: Pick<User, "name">;
        group: Pick<Group, "name">;
    }

    interface ExistingListProps extends Pick<List, "id"> {
        canModify: boolean;
    }

    interface Props {
        userId: string;
        item: Partial<Item> & {
            itemPrice?: ItemPrice | null;
            lists?: ExistingListProps[];
        };
        lists?: {
            usersLists: ListProps[];
            managedLists: ListProps[];
        };
        currentList?: string;
        buttonText: string;
        saving: boolean;
        productUrl?: string | null;
    }

    let {
        userId,
        item = $bindable(),
        buttonText,
        lists: otherLists,
        currentList,
        saving = false,
        productUrl = page.url.searchParams.get("productUrl")
    }: Props = $props();
    const t = getFormatter();

    let productData = $state(item);
    let form = $derived(page.form);
    let fetching = $state(false);
    let urlFetched = $state(false);
    let price: number | null = $state(getPriceValue(productData));
    const defaultCurrency = getDefaultCurrency();
    let userCurrency: string = $derived(productData.itemPrice?.currency || defaultCurrency);
    let quantity = $state(item.quantity || 1);
    let unlimited = $state(item.quantity === null);

    const listsHavingItem = $derived.by(() => {
        return productData.lists
            ? productData.lists.reduce(
                  (accum, list) => {
                      accum[list.id] = list.canModify;
                      return accum;
                  },
                  {} as Record<string, boolean>
              )
            : { [currentList || ""]: true };
    });
    const lists = $derived.by(() => {
        function nameAndSortLists(lists: ListProps[] | undefined) {
            if (!lists) return [];
            return lists
                .map((l) => ({
                    ...l,
                    name: l.name || $t("wishes.wishes-for", { values: { listOwner: l.owner.name } })
                }))
                .toSorted((a, b) =>
                    listsHavingItem[a.id] !== undefined
                        ? -Infinity
                        : listsHavingItem[b.id] !== undefined
                          ? Infinity
                          : a.name?.localeCompare(b.name)
                );
        }
        return {
            usersLists: nameAndSortLists(otherLists?.usersLists),
            managedLists: nameAndSortLists(otherLists?.managedLists)
        };
    });

    const extractUrl = (url: string) => {
        const urlRegex = /(https?):\/\/[^\s/$.?#].[^\s]*/;
        const matches = url.match(urlRegex);
        if (matches) {
            return encodeURIComponent(matches[0]);
        }
        return null;
    };

    const triggerToast = () => {
        toaster.warning({ description: $t("errors.unable-to-find-product-information") });
    };

    const getInfo = async () => {
        if (productData.url && !urlFetched && !fetching) {
            fetching = true;
            try {
                const url = extractUrl(productData.url);
                const res = await fetch(`/api/product?url=${url}`);
                if (res.ok) {
                    let newProductData: ProductData = await res.json();
                    productData.url = newProductData.url ? newProductData.url : url;
                    productData.name = newProductData.name ? newProductData.name : newProductData.title || "";
                    if (newProductData.image) {
                        try {
                            const imageUrl = new URL(newProductData.image);
                            productData.imageUrl = imageUrl.href;
                        } catch {
                            if (newProductData.url) {
                                try {
                                    const url = new URL(newProductData.url);
                                    const imageUrl = new URL(newProductData.image, url);
                                    productData.imageUrl = imageUrl.href;
                                } catch {
                                    // invalid image, stop strying to make it work
                                }
                            }
                        }
                    }

                    if (newProductData.price) {
                        productData.itemPrice = {
                            id: "temp-id",
                            currency: newProductData.currency || defaultCurrency,
                            value: newProductData.price
                        };
                        price = newProductData.price;
                    }
                } else {
                    triggerToast();
                }
                urlFetched = true;
            } catch {
                triggerToast();
            } finally {
                fetching = false;
            }
        }
    };

    onMount(async () => {
        if (productUrl) {
            productData.url = productUrl;
            await getInfo();
        }
    });

    // Hijack the back button to navigate back to the redirect
    onMount(() => {
        const callback = async (_event: PopStateEvent) => {
            if (page.url.searchParams.has("redirectTo")) {
                await goto(page.url.searchParams.get("redirectTo")!, { invalidateAll: true });
            }
        };
        addEventListener("popstate", callback, { once: true });
        return () => removeEventListener("popstate", callback);
    });

    const onCancel = () => {
        if (page.url.searchParams.has("redirectTo")) {
            goto(page.url.searchParams.get("redirectTo")!, { replaceState: true });
        } else {
            history.back();
        }
    };

    const selectAll = () => {
        document.getElementsByName("lists").forEach((el) => ((el as HTMLInputElement).checked = true));
    };
</script>

<fieldset class="m3-form-surface m3-import-form" aria-busy={saving} disabled={fetching}>
    <FormSection title={$t("ui.product-link")}>
        <div class="m3-form-grid">
            <label class="m3-label col-span-full" for="url">
                <span>{$t("wishes.item-url")}</span>
                <div class="flex flex-row gap-x-4">
                    <div class="m3-field w-full grid-cols-[auto_1fr_auto]">
                        <div class="m3-field-slot">
                            <iconify-icon icon="ion:link"></iconify-icon>
                        </div>
                        <input
                            id="url"
                            name="url"
                            class="m3-field-input"
                            onfocusout={() => getInfo()}
                            placeholder={$t("wishes.url-placeholder")}
                            type="url"
                            bind:value={productData.url}
                        />
                        {#if productData.url}
                            <button
                                id="reset-field"
                                class="m3-field-slot"
                                aria-label={$t("a11y.clear-url-field")}
                                onclick={() => (productData.url = null)}
                                type="button"
                            >
                                <iconify-icon icon="ion:close-circle"></iconify-icon>
                            </button>
                        {/if}
                    </div>
                    {#if productData.url}
                        <button
                            id="refresh-item"
                            class="m3-secondary m3-button m3-icon-button"
                            aria-label={$t("a11y.refresh-item-data")}
                            onclick={(e) => {
                                e.preventDefault();
                                urlFetched = false;
                                getInfo();
                            }}
                            type="button"
                        >
                            <iconify-icon icon="ion:refresh"></iconify-icon>
                        </button>
                    {/if}
                </div>
            </label>
        </div>
        {#if fetching}
            <div class="m3-inline-progress" role="status">
                <span class="m3-linear-progress" aria-hidden="true"><span></span></span>
                <span>{$t("wishes.hang-tight-gathering-product-data")}</span>
            </div>
        {/if}
    </FormSection>
    <FormSection title={$t("ui.details")}>
        <div class="m3-form-grid">
            <label class="m3-label col-span-full xl:col-span-2" for="name">
                <span>{$t("wishes.item-name")}*</span>
                <div class="m3-field grid-cols-[auto_1fr]">
                    <div class="m3-field-slot">
                        <iconify-icon icon="ion:bag-handle"></iconify-icon>
                    </div>
                    <input
                        id="name"
                        name="name"
                        class="m3-field-input"
                        class:m3-invalid={form?.errors?.name}
                        aria-describedby={form?.errors?.name ? "name-error" : undefined}
                        aria-invalid={!!form?.errors?.name}
                        autocomplete="off"
                        required
                        type="text"
                        bind:value={productData.name}
                    />
                </div>
                {#if form?.errors?.name}
                    <p id="name-error" class="text-invalid" role="alert">{form.errors.name[0]}</p>
                {/if}
            </label>

            <div class="m3-label col-span-full sm:col-span-3 xl:col-span-2">
                <label for="formatted-price">{$t("wishes.price")}</label>
                <CurrencyInput id="price" name="price" currency={userCurrency} bind:value={price} />
            </div>

            <div class="m3-label col-span-full sm:col-span-4 xl:col-span-3">
                <label for="quantity">
                    <span>{$t("wishes.quantity")}</span>
                </label>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <div class="min-w-[11rem] flex-1">
                        <div class={["m3-field", !unlimited ? "m3-quantity-stepper" : "grid-cols-[auto_1fr]"]}>
                            <div class="m3-field-slot">
                                <iconify-icon aria-hidden="true" icon="ion:gift"></iconify-icon>
                            </div>
                            <input
                                id="quantity"
                                name="quantity"
                                class="m3-field-input"
                                autocomplete="off"
                                defaultValue={1}
                                disabled={unlimited}
                                inputmode="numeric"
                                max="999"
                                min="1"
                                onchange={(e) => {
                                    if (!isNaN(e.currentTarget.valueAsNumber)) {
                                        quantity = e.currentTarget.valueAsNumber;
                                    }
                                }}
                                required={unlimited ? false : true}
                                step="1"
                                type={unlimited ? "text" : "number"}
                                value={unlimited ? $t("general.na") : quantity}
                            />
                            {#if !unlimited}
                                <div class="m3-quantity-stepper-controls">
                                    <button
                                        class="m3-quantity-step-btn"
                                        aria-label={$t("a11y.decrease-quantity")}
                                        disabled={quantity <= 1}
                                        onclick={() => (quantity = Math.max(1, quantity - 1))}
                                        type="button"
                                    >
                                        <iconify-icon aria-hidden="true" icon="ion:remove"></iconify-icon>
                                    </button>
                                    <button
                                        class="m3-quantity-step-btn"
                                        aria-label={$t("a11y.increase-quantity")}
                                        disabled={quantity >= 999}
                                        onclick={() => (quantity = Math.min(999, quantity + 1))}
                                        type="button"
                                    >
                                        <iconify-icon aria-hidden="true" icon="ion:add"></iconify-icon>
                                    </button>
                                </div>
                            {/if}
                        </div>
                    </div>
                    <label class="checkbox-label w-fit shrink-0 whitespace-nowrap" for="unlimited">
                        <input id="unlimited" class="checkbox" type="checkbox" bind:checked={unlimited} />
                        <span>{$t("wishes.no-limit")}</span>
                    </label>
                </div>
                {#if form?.errors?.quantity}
                    <p class="text-invalid">{form.errors.quantity[0]}</p>
                {/if}
            </div>
        </div>
    </FormSection>
    <FormSection title={$t("ui.images")}>
        <div class="m3-form-grid">
            <div class="m3-label col-span-full md:col-span-3">
                <span>{$t("wishes.upload-image")}</span>
                <FileUpload name="image" accept="image/*" label={$t("wishes.upload-image")} />
            </div>

            <label class="m3-label col-span-full md:col-span-4" for="imageUrl">
                <span>{$t("wishes.image-url")}</span>
                <div class="m3-field grid-cols-[auto_1fr]">
                    <div class="m3-field-slot">
                        <iconify-icon icon="ion:image"></iconify-icon>
                    </div>
                    <input
                        id="imageUrl"
                        name="imageUrl"
                        class="m3-field-input"
                        autocomplete="off"
                        type="text"
                        bind:value={productData.imageUrl}
                    />
                </div>
            </label>

            <div class="col-span-full">
                <label class="checkbox-label w-fit" for="mostWanted">
                    <input
                        id="mostWanted"
                        name="mostWanted"
                        class="checkbox"
                        checked={item.mostWanted}
                        type="checkbox"
                    />
                    <span>{$t("wishes.most-wanted")}</span>
                </label>
                <span class="subtext">{$t("wishes.most-wanted-description")}</span>
            </div>
        </div>
    </FormSection>
    <FormSection title={$t("ui.notes-and-lists")}>
        <div class="m3-form-grid">
            <div class="m3-label col-span-full">
                <label for="note">{$t("wishes.notes")}</label>
                <MarkdownEditor
                    id="note"
                    name="note"
                    placeholder={$t("wishes.note-placeholder")}
                    value={productData.note}
                />
            </div>

            <fieldset
                class={[
                    "col-span-full flex flex-col space-y-2 md:col-span-5",
                    lists.usersLists.length + lists.managedLists.length <= 1 && "hidden"
                ]}
                aria-labelledby="lists-label"
            >
                <div class="flex items-center justify-between gap-2">
                    <legend id="lists-label">{$t("wishes.lists")}</legend>
                    {#if !item.createdById || item.createdById === userId}
                        <button class="m3-secondary m3-button m3-button-small" onclick={selectAll} type="button">
                            {$t("general.select-all")}
                        </button>
                    {/if}
                </div>

                {#if item.createdById && item.createdById !== userId}
                    <p class="text-warning-800-200 text-sm">{$t("wishes.cannot-update-lists-of-item")}</p>
                {/if}

                <div
                    class={[
                        "m3-choice-list",
                        form?.errors?.lists && "m3-invalid",
                        item.createdById && item.createdById !== userId && "disabled"
                    ]}
                >
                    {#snippet displayList(list: ListProps)}
                        <label class="flex items-center gap-x-2" for={list.id}>
                            <input
                                id={list.id}
                                name="lists"
                                class="checkbox"
                                checked={listsHavingItem[list.id] !== undefined}
                                disabled={listsHavingItem[list.id] === false}
                                type="checkbox"
                                value={list.id}
                            />
                            <div class="mt-0! flex flex-row gap-x-2">
                                <span>
                                    {list.name}
                                </span>
                                {#if list.group?.name}
                                    <span class="font-bold italic">({list.group.name})</span>
                                {/if}
                            </div>
                        </label>
                    {/snippet}
                    {#each lists.usersLists as list (list.id)}
                        {@render displayList(list)}
                    {/each}
                    {#each lists.managedLists as list, i (list.id)}
                        {#if i === 0}
                            <span class="text-subtle">{$t("wishes.managed-lists")}</span>
                        {/if}
                        {@render displayList(list)}
                    {/each}
                </div>
                {#if form?.errors?.lists}
                    <p class="text-invalid">{form.errors.lists[0]}</p>
                {/if}
            </fieldset>
        </div>
    </FormSection>
    <span class="text-subtle text-sm">*{$t("general.required-field")}</span>

    <div class="m3-form-actions">
        <button class="m3-secondary m3-button" disabled={fetching || saving} onclick={onCancel} type="button">
            {$t("general.cancel")}
        </button>
        {#if !item.id}
            <SplitSubmitButton disabled={fetching || saving} label={buttonText} {saving} />
        {:else}
            <button id="submit" class="m3-primary m3-button" disabled={fetching || saving} type="submit">
                {#if saving}<span class="loading loading-xs" aria-hidden="true"></span>{/if}
                <span>{buttonText}</span>
            </button>
        {/if}
    </div>
</fieldset>
