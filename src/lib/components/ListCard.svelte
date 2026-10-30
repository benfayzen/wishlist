<script lang="ts">
    import type { List, User } from "$lib/generated/prisma/client";
    import { Progress } from "@skeletonlabs/skeleton-svelte";
    import { validSeed, createTheme } from "$lib/theme";
    import { hexFromArgb } from "@material/material-color-utilities";
    import Avatar from "./Avatar.svelte";
    import { getFormatter } from "$lib/i18n";

    interface ListWithCounts extends Partial<Pick<List, "id" | "name" | "icon" | "iconColor" | "hideOwner">> {
        owner: Pick<User, "name" | "username" | "picture">;
        itemCount?: number;
        claimedCount?: number;
        unapprovedCount?: number;
    }

    interface Props {
        hideCount?: boolean;
        list: ListWithCounts;
        hasNewItems?: boolean;
        preventNavigate?: boolean;
    }

    const { hideCount = false, hasNewItems = false, list, preventNavigate = false }: Props = $props();
    const t = getFormatter();

    let listName = $derived(list.name || $t("wishes.wishes-for", { values: { listOwner: list.owner.name } }));
    let availableCount = $derived((list.itemCount ?? 0) - (list.claimedCount ?? 0));
    let claimedPercent = $derived(
        list.itemCount && list.itemCount > 0
            ? Math.min(100, Math.round(((list.claimedCount ?? 0) / list.itemCount) * 100))
            : 0
    );
    let iconTheme = $derived(createTheme(validSeed(list.iconColor)));
    let iconBgLight = $derived(hexFromArgb(iconTheme.light.primaryContainer));
    let iconFgLight = $derived(hexFromArgb(iconTheme.light.onPrimaryContainer));
    let iconBgDark = $derived(hexFromArgb(iconTheme.dark.primaryContainer));
    let iconFgDark = $derived(hexFromArgb(iconTheme.dark.onPrimaryContainer));
    let elementTag = $derived(preventNavigate ? "div" : "a");
</script>

<svelte:element
    this={elementTag}
    {...!preventNavigate ? { href: `/lists/${list.id}` } : {}}
    class={["m3-list-card", list.unapprovedCount && list.unapprovedCount > 0 && "m3-list-card-stack"]}
    data-testid="list-card"
>
    {#if list.unapprovedCount && list.unapprovedCount > 0}
        <div class="m3-list-card-approval">
            <iconify-icon aria-hidden="true" icon="ion:information-circle"></iconify-icon>
            <p>
                {$t("wishes.approvals-waiting", { values: { approvalCount: list.unapprovedCount } })}
            </p>
        </div>
    {/if}

    <div class="m3-card m3-list-card-content grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 p-4">
        <div
            style:--list-icon-bg-light={iconBgLight}
            style:--list-icon-fg-light={iconFgLight}
            style:--list-icon-bg-dark={iconBgDark}
            style:--list-icon-fg-dark={iconFgDark}
            class="m3-list-card-icon"
        >
            <iconify-icon class="text-2xl" icon={"ion:" + (list.icon ?? "gift")}></iconify-icon>
        </div>
        <div class="flex flex-col gap-1">
            <span class="line-clamp-2 text-xl font-bold text-[var(--md-on-surface)]" data-testid="list-name">
                {listName}
            </span>
            {#if !list.hideOwner}
                <div class="grid grid-cols-[1.5rem_auto] items-center gap-2 text-sm md:text-base">
                    <Avatar class="text-tiny size-5 justify-self-center md:size-6" user={list.owner} />
                    <span class="text-subtle" data-testid="list-owner">{list.owner.name}</span>
                </div>
            {/if}
            <div class="contents" data-testid="item-count">
                <div class="grid grid-cols-[1.5rem_auto_1fr] items-center gap-2 text-sm md:text-base">
                    {#if hideCount}
                        <iconify-icon class="justify-self-center" icon="ion:gift"></iconify-icon>
                        <span>{$t("wishes.items-requested", { values: { itemCount: list.itemCount } })}</span>
                    {:else}
                        <Progress class="relative w-fit justify-self-center" value={claimedPercent}>
                            <div class="absolute inset-0 flex items-center justify-center">
                                <iconify-icon
                                    class="flex size-2.5 items-center justify-center"
                                    height="none"
                                    icon="ion:gift"
                                    width="none"
                                ></iconify-icon>
                            </div>
                            <Progress.Circle
                                class="[--size:--spacing(5)] [--thickness:calc(var(--size)/8)] md:[--size:--spacing(6)]"
                            >
                                <Progress.CircleTrack />
                                <Progress.CircleRange />
                            </Progress.Circle>
                        </Progress>
                        <span class="font-bold">{$t("wishes.items-available", { values: { availableCount } })}</span>
                    {/if}

                    {#if hasNewItems}
                        <iconify-icon
                            class="flex size-2 justify-center text-[var(--md-primary)] opacity-60"
                            height="none"
                            icon="ion:ellipse-sharp"
                            width="none"
                        ></iconify-icon>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</svelte:element>
