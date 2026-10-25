<script lang="ts">
    import { getFormatter } from "$lib/i18n";
    import type { MouseEventHandler } from "svelte/elements";

    interface Props {
        onclick?: MouseEventHandler<HTMLButtonElement>;
    }

    const { onclick }: Props = $props();
    const t = getFormatter();
</script>

<button class="m3-action-pill" {onclick} type="button">
    <span class="m3-action-pill-surface">
        <iconify-icon aria-hidden="true" icon="material-symbols:settings-rounded"></iconify-icon>
        <span>{$t("wishes.manage")}</span>
    </span>
</button>
