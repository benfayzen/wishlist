<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLSelectAttributes } from "svelte/elements";

    let {
        value = $bindable(),
        icon,
        children,
        class: className,
        ...props
    }: HTMLSelectAttributes & { icon?: string; children: Snippet } = $props();
</script>

<div class={["m3-select-wrapper", icon && "has-leading-icon", className]}>
    {#if icon}
        <span class="m3-select-leading" aria-hidden="true">
            <iconify-icon {icon}></iconify-icon>
        </span>
    {/if}
    <select {...props} class="m3-select" bind:value>{@render children()}</select>
    <span class="m3-select-chevron" aria-hidden="true">
        <iconify-icon icon="ion:chevron-down"></iconify-icon>
    </span>
</div>
