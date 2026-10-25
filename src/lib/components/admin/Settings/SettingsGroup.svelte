<script lang="ts">
    import FormSection from "$lib/components/FormSection.svelte";
    import type { Snippet } from "svelte";

    interface Props {
        title: string;
        children: Snippet;
    }

    const { title, children }: Props = $props();
</script>

<FormSection {title}>
    {@render children()}
</FormSection>
