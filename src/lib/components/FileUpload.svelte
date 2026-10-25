<script lang="ts">
    import { getFormatter } from "$lib/i18n";
    import { FileUpload, type FileUploadRootProps } from "@skeletonlabs/skeleton-svelte";

    const { label, ...props }: FileUploadRootProps & { label?: string } = $props();

    const t = getFormatter();
</script>

<FileUpload {...props} class={["m3-upload", props.class]}>
    <FileUpload.Trigger class="m3-button m3-button-small m3-primary h-fit">
        {$t("general.select-file")}
    </FileUpload.Trigger>
    <FileUpload.Label class="sr-only">{label ?? $t("wishes.upload-image")}</FileUpload.Label>
    <FileUpload.HiddenInput />
    <FileUpload.ItemGroup>
        <FileUpload.Context>
            {#snippet children(fileUpload)}
                {#if fileUpload().acceptedFiles.length === 1}
                    {@const file = fileUpload().acceptedFiles.at(0)!}
                    <FileUpload.Item {file}>
                        <FileUpload.ItemName class="truncate">{file.name}</FileUpload.ItemName>
                        <FileUpload.ItemDeleteTrigger />
                    </FileUpload.Item>
                {:else}
                    <span class="pl-2 text-base">
                        {$t("general.no-file-selected")}
                    </span>
                {/if}
            {/snippet}
        </FileUpload.Context>
    </FileUpload.ItemGroup>
</FileUpload>
