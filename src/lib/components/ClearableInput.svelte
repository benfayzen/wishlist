<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLInputAttributes } from "svelte/elements";
    import FieldShell from "./FieldShell.svelte";
    interface Props extends HTMLInputAttributes {
        onValueClear: () => void;
        showClearButton: () => boolean;
        clearButtonLabel: string;
        lead?: Snippet;
    }
    let { value = $bindable(), onValueClear, showClearButton, clearButtonLabel, lead, ...props }: Props = $props();
</script>

<FieldShell leading={lead}>
    <input {...props} class="m3-field-input" bind:value />
    {#snippet trailing()}
        {#if showClearButton()}
            <button
                id="reset-{props.id}"
                class="m3-field-slot"
                aria-label={clearButtonLabel}
                onclick={onValueClear}
                type="button"
            >
                <iconify-icon aria-hidden="true" icon="ion:close-circle"></iconify-icon>
            </button>
        {/if}
    {/snippet}
</FieldShell>
