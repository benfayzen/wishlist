<script lang="ts">
    import { getFormatter } from "$lib/i18n";
    import { Steps } from "@skeletonlabs/skeleton-svelte";
    import type { HTMLButtonAttributes } from "svelte/elements";

    interface Props {
        submitting?: boolean;
        prevButton?: HTMLButtonAttributes;
        nextButton?: HTMLButtonAttributes;
    }

    let { submitting, prevButton, nextButton }: Props = $props();
    const t = getFormatter();
</script>

<Steps.Context>
    {#snippet children(api)}
        {@const isLastStep = api().value === api().count - 1}
        <div class="flex items-center justify-between gap-2 pt-4">
            <!-- Previous -->
            <Steps.PrevTrigger class="m3-button m3-secondary  " {...prevButton}>
                <iconify-icon icon="ion:arrow-back"></iconify-icon>
                <span>{$t("setup.back")}</span>
            </Steps.PrevTrigger>

            <!-- Next / Complete -->
            <button class="m3-button m3-primary" {...nextButton}>
                {#if submitting}
                    <span class="loading loading-spinner loading-xs"></span>
                {/if}
                <span>{isLastStep ? $t("setup.complete") : $t("setup.next")}</span>
                <iconify-icon icon={isLastStep ? "ion:checkmark" : "ion:arrow-forward"}></iconify-icon>
            </button>
        </div>
    {/snippet}
</Steps.Context>
