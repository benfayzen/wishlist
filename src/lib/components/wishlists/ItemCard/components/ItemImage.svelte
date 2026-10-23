<script lang="ts">
    import { getFormatter } from "$lib/i18n";
    import type { ClassValue } from "svelte/elements";
    import Image from "$lib/components/Image.svelte";
    import { resolve } from "$app/paths";
    import type { MessageFormatter } from "$lib/server/i18n";
    import type { InternalItemCardProps } from "../ItemCard.svelte";
    import type { Snippet } from "svelte";

    interface Props extends Pick<InternalItemCardProps, "item"> {
        class?: ClassValue;
        defaultImage: Snippet<[t: MessageFormatter]>;
        shrinkBadge?: boolean;
        badgeClass?: ClassValue;
    }

    const { item, defaultImage, shrinkBadge = false, badgeClass, ...props }: Props = $props();
    const t = getFormatter();

    const imageUrl: string | undefined = $derived.by(() => {
        if (item.imageUrl) {
            try {
                new URL(item.imageUrl);
                return item.imageUrl;
            } catch {
                if (item.imageUrl.startsWith("/") || item.imageUrl.endsWith("/")) {
                    return;
                }
                return resolve("/api/assets/[id]", { id: item.imageUrl });
            }
        }
    });
</script>

<div class={[props.class, "m3-item-image relative"]}>
    {#if item.mostWanted}
        <div
            class={["m3-wish-badge", shrinkBadge && "m3-wish-badge--compact", badgeClass]}
            data-testid="most-wanted-badge"
            title={$t("wishes.most-wanted")}
        >
            <span class="m3-wish-badge-emblem" aria-hidden="true">
                <svg focusable="false" viewBox="0 0 40 40">
                    <g fill="var(--md-tertiary)">
                        <circle cx="20" cy="20" r="15" />
                        {#each Array(12) as _, i}
                            <circle cx="20" cy="7" r="6" transform={`rotate(${i * 30} 20 20)`} />
                        {/each}
                    </g>
                    <path
                        d="m20 10 3.05 6.18 6.82 1-4.94 4.81 1.17 6.8L20 25.58l-6.1 3.21 1.17-6.8-4.94-4.81 6.82-1Z"
                        fill="var(--md-on-tertiary)"
                    />
                </svg>
            </span>
            <span class="m3-wish-badge-label">{$t("wishes.most-wanted")}</span>
        </div>
    {/if}
    <Image class={props.class} alt={item.name} data-testid="image" referrerpolicy="no-referrer" src={imageUrl}>
        {@render defaultImage($t)}
    </Image>
</div>
