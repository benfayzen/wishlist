<script lang="ts">
    import type { Snippet } from "svelte";
    import type { ClassValue } from "svelte/elements";
    let { title, children, class: clazz }: { title: string; children: Snippet; class?: ClassValue } = $props();
    const id = $props.id();
</script>

<section class={["m3-form-section", clazz]} aria-labelledby={id}>
    <h2 {id} class="m3-section-title">{title}</h2>
    {@render children()}
</section>
