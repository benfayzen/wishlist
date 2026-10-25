<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import AdaptivePicker from "$lib/components/AdaptivePicker.svelte";
    import { getFormatter } from "$lib/i18n";
    import type { ClassValue } from "svelte/elements";

    const {
        options,
        defaultOption,
        searchParam,
        label,
        directionParam,
        prefix,
        showLabel = false,
        multiselect = false,
        class: clazz,
        testId
    }: {
        options: Option[];
        defaultOption: Option;
        searchParam: string;
        label?: string;
        directionParam?: string;
        prefix?: string;
        showLabel?: boolean;
        multiselect?: boolean;
        class?: ClassValue;
        testId?: string;
    } = $props();
    const t = getFormatter();
    const name = $props.id();
    let menuOpen = $state(false);
    const selectedOptions = $derived.by(() => {
        let filter = page.url.searchParams.get(searchParam);
        if (!filter) return [defaultOption];
        // Preserve compatibility with existing doubly encoded filter URLs.
        try {
            filter = decodeURIComponent(filter);
        } catch {
            return [defaultOption];
        }
        if (multiselect) {
            const values = filter.split(",");
            const selected = options.filter((option) => values.includes(option.value));
            return selected.length ? selected : [defaultOption];
        }
        const direction = directionParam ? page.url.searchParams.get(directionParam) : null;
        const selected = options.find(
            (option) => option.value === filter && (!option.direction || option.direction === (direction ?? "asc"))
        );
        return [selected ?? defaultOption];
    });
    let pendingSelectedOptions: Option[] = $state([]);
    $effect(() => {
        if (!menuOpen) pendingSelectedOptions = [...selectedOptions];
    });
    const isDefault = (opts: Option[]) => opts.length === 1 && opts[0].value === defaultOption.value;
    const active = $derived(!isDefault(selectedOptions));
    const selectionLabel = $derived(selectedOptions.map((option) => option.displayValue).join(", "));
    const accessibleLabel = $derived(label ? `${label}: ${selectionLabel}` : selectionLabel);

    function toggle(option: Option, checked: boolean) {
        if (checked) {
            pendingSelectedOptions =
                option.value === defaultOption.value || isDefault(pendingSelectedOptions)
                    ? [option]
                    : [...pendingSelectedOptions.filter((item) => item.value !== option.value), option];
        } else {
            pendingSelectedOptions = pendingSelectedOptions.filter((item) => item.value !== option.value);
        }
    }
    function apply(option?: Option) {
        const selected = option ? [option] : pendingSelectedOptions;
        const next = new URL(page.url);
        if (!selected.length || isDefault(selected)) {
            next.searchParams.delete(searchParam);
            if (directionParam) next.searchParams.delete(directionParam);
        } else {
            next.searchParams.set(searchParam, encodeURIComponent(selected.map((item) => item.value).join(",")));
            if (directionParam && selected[0].direction) next.searchParams.set(directionParam, selected[0].direction);
        }
        menuOpen = false;
        goto(next, { replaceState: true });
    }
</script>

<div class={["m3-filter", clazz]} data-testid={testId}>
    <AdaptivePicker label={label ?? $t("wishes.filter")} bind:open={menuOpen}>
        {#snippet trigger(props)}
            <button
                {...props}
                class="m3-filter-chip"
                aria-label={accessibleLabel}
                data-active={active}
                title={accessibleLabel}
                type="button"
            >
                <span class="m3-filter-chip-surface">
                    {#if active && !directionParam}
                        <iconify-icon aria-hidden="true" icon="material-symbols:check-rounded"></iconify-icon>
                    {:else if prefix}
                        <iconify-icon aria-hidden="true" icon={prefix}></iconify-icon>
                    {/if}
                    <span class="m3-filter-chip-label">
                        {#if showLabel && label}
                            <span class="m3-filter-chip-category">{label}:</span>
                        {/if}
                        <span class="m3-filter-chip-value">{selectedOptions[0].displayValue}</span>
                        {#if multiselect && selectedOptions.length > 1}
                            <span class="m3-filter-chip-count">+{selectedOptions.length - 1}</span>
                        {/if}
                    </span>
                    <iconify-icon
                        class="m3-picker-arrow"
                        aria-hidden="true"
                        icon="material-symbols:expand-more-rounded"
                    ></iconify-icon>
                </span>
            </button>
        {/snippet}
        <div class="m3-picker-options" aria-label={label ?? $t("wishes.filter")} role="group">
            {#each options as option (option.value + (option.direction ?? ""))}
                {@const selected = multiselect
                    ? pendingSelectedOptions.some((item) => item.value === option.value)
                    : selectedOptions[0] === option}
                <label class="m3-picker-option" data-selected={selected}>
                    {#if multiselect}
                        <input
                            class="checkbox"
                            checked={selected}
                            onchange={(event) => toggle(option, event.currentTarget.checked)}
                            type="checkbox"
                        />
                    {:else}
                        <input {name} class="m3-radio" checked={selected} onchange={() => apply(option)} type="radio" />
                    {/if}
                    <span>{option.displayValue}</span>
                </label>
            {/each}
        </div>
        {#if multiselect}
            <div class="m3-picker-actions">
                <button id="cancel" class="m3-text-button m3-button" onclick={() => (menuOpen = false)} type="button">
                    {$t("general.cancel")}
                </button>
                <button id="apply" class="m3-primary m3-button" onclick={() => apply()} type="button">
                    {$t("general.apply")}
                </button>
            </div>
        {/if}
    </AdaptivePicker>
</div>
