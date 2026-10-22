<script lang="ts">
    import type { Snippet } from "svelte";
    import type { ClassValue } from "svelte/elements";
    let {
        children,
        leading,
        trailing,
        class: clazz
    }: {
        children: Snippet;
        leading?: Snippet;
        trailing?: Snippet;
        class?: ClassValue;
    } = $props();
</script>

<div
    style:grid-template-columns={`${leading ? "auto " : ""}minmax(0, 1fr)${trailing ? " auto" : ""}`}
    class={["m3-field", clazz]}
>
    {#if leading}<div class="m3-field-slot">{@render leading()}</div>{/if}
    {@render children()}
    {@render trailing?.()}
</div>
