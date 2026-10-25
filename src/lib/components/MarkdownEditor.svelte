<script lang="ts">
    import { Tabs } from "@skeletonlabs/skeleton-svelte";
    import Markdown from "./Markdown.svelte";
    import { getFormatter } from "$lib/i18n";

    interface Props {
        id: string;
        name: string;
        placeholder?: string;
        value?: string | null;
    }
    let { value = $bindable(), ...rest }: Props = $props();
    const t = getFormatter();

    let currentTab = $state("write");
    let previewNote = $derived(currentTab === "preview");
</script>

<div class="m3-editor">
    <Tabs class="border-none" onValueChange={({ value }) => (currentTab = value)} value={currentTab}>
        <Tabs.List class="flex overflow-auto">
            <Tabs.Trigger value={"write"}>{$t("wishes.write")}</Tabs.Trigger>
            <Tabs.Trigger value={"preview"}>{$t("wishes.preview")}</Tabs.Trigger>
            <Tabs.Indicator />
        </Tabs.List>
    </Tabs>
    <textarea {...rest} class="m3-textarea" class:hidden={previewNote} rows="4" bind:value></textarea>
    {#if previewNote}
        {#if value}
            <div class="m3-editor-preview" data-testid="markdown-preview">
                <Markdown source={value} />
            </div>
        {/if}
    {/if}
    <a
        class="m3-secondary m3-button m3-button-small mt-1"
        href="https://www.markdownguide.org/basic-syntax/"
        target="_blank"
    >
        <iconify-icon icon="ion:logo-markdown"></iconify-icon>
        <span>{$t("wishes.supports-markdown")}</span>
    </a>
</div>
