<script lang="ts">
    import { getFormatter } from "$lib/i18n";
    const t = getFormatter();
</script>

<div class="m3-navigation-progress" aria-label={$t("general.processing")} role="progressbar">
    <span class="m3-linear-progress" aria-hidden="true"><span></span></span>
</div>
