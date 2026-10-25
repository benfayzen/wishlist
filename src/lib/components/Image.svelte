<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLImgAttributes } from "svelte/elements";

    interface Props extends HTMLImgAttributes {
        children?: Snippet;
    }

    const { children, src, ...rest }: Props = $props();

    let failedSrc = $state<Props["src"]>();
</script>

{#if failedSrc === src || !src}
    {@render children?.()}
{:else}
    <img {...rest} onerror={() => (failedSrc = src)} {src} />
{/if}
