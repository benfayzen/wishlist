<script lang="ts">
    import { getFormatter } from "$lib/i18n";

    interface Props {
        reordering: boolean;
        onFinalize: VoidFunction;
    }

    let { reordering = $bindable(), onFinalize }: Props = $props();
    const t = getFormatter();
</script>

<button
    class="m3-action-pill"
    aria-pressed={reordering}
    onclick={() => (reordering ? onFinalize() : (reordering = true))}
    type="button"
>
    <span class="m3-action-pill-surface">
        <iconify-icon
            aria-hidden="true"
            icon={reordering ? "material-symbols:check-rounded" : "material-symbols:reorder-rounded"}
        ></iconify-icon>
        <span>{reordering ? $t("wishes.finish") : $t("wishes.reorder")}</span>
    </span>
</button>
