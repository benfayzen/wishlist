<script lang="ts">
    import { getFormatter } from "$lib/i18n";
    import type { MouseEventHandler } from "svelte/elements";

    interface Props {
        onclick?: MouseEventHandler<HTMLButtonElement>;
    }

    const { onclick }: Props = $props();
    const t = getFormatter();
</script>

<div>
    <button class="m3-text-button m3-button m3-button-small" {onclick}>
        <iconify-icon icon="ion:build"></iconify-icon>
        <span>{$t("wishes.manage")}</span>
    </button>
</div>
