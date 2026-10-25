<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLSelectAttributes } from "svelte/elements";
    let { value = $bindable(), children, ...props }: HTMLSelectAttributes & { children: Snippet } = $props();
</script>

<select {...props} class={["m3-select", props.class]} bind:value>{@render children()}</select>
