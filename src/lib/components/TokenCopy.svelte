<script lang="ts">
    import { Portal, Tooltip } from "@skeletonlabs/skeleton-svelte";
    import { fade } from "$lib/motion";
    import { getFormatter } from "$lib/i18n";
    import type { ClassValue } from "svelte/elements";
    import { clipboard } from "$lib/clipboard.svelte";

    interface Props {
        url: string;
        btnStyle?: ClassValue;
        children?: import("svelte").Snippet;
        onCopied?: VoidFunction;
    }

    let { url, btnStyle = "m3-icon-button", children, onCopied }: Props = $props();
    const t = getFormatter();

    let copiedVisible = $state(false);
</script>

<div class="flex flex-row items-center">
    <span class="text-ellipsis">
        <a class="anchor" href={url}>
            {@render children?.()}
        </a>
        <span id="tokenUrl" hidden>{url}</span>
    </span>
    <div class="flex flex-row items-center">
        <Tooltip>
            <Tooltip.Trigger
                class="m3-button {btnStyle}"
                {@attach clipboard("tokenUrl")}
                aria-label={$t("general.copy-to-clipboard")}
                onclick={() => {
                    onCopied?.();
                    copiedVisible = true;
                    setTimeout(() => (copiedVisible = false), 1000);
                }}
                type="button"
            >
                <iconify-icon icon="ion:copy"></iconify-icon>
            </Tooltip.Trigger>
            <Portal>
                <Tooltip.Positioner>
                    <Tooltip.Content class="m3-tooltip">
                        <span>{$t("general.copy-to-clipboard")}</span>
                        <Tooltip.Arrow
                            class="[--arrow-background:var(--md-inverse-surface)] [--arrow-size:--spacing(2)]"
                        >
                            <Tooltip.ArrowTip />
                        </Tooltip.Arrow>
                    </Tooltip.Content>
                </Tooltip.Positioner>
            </Portal>
        </Tooltip>

        <span role="status">
            {#if copiedVisible}<span out:fade>{$t("general.copied")}</span>{/if}
        </span>
    </div>
</div>
