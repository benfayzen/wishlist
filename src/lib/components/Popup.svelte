<script lang="ts">
    import {
        Popover,
        Portal,
        type PopoverContentProps,
        type PopoverRootProps,
        type PopoverTriggerProps
    } from "@skeletonlabs/skeleton-svelte";
    import type { ClassValue } from "svelte/elements";

    interface Props {
        open?: boolean;
        trigger: PopoverTriggerProps["element"];
        content: PopoverContentProps["element"];
        zIndex?: ClassValue;
        placement?: NonNullable<PopoverRootProps["positioning"]>["placement"];
    }

    // Keep portaled menus above navigation and below modal backdrops; dialogs may override.
    let { open = $bindable(false), trigger, content, zIndex = "z-20!", placement = "bottom" }: Props = $props();

    const transitionFade =
        "data-[state=closed]:opacity-0 data-[state=open]:opacity-100 starting:data-[state=closed]:opacity-100 starting:data-[state=open]:opacity-0";
    const transitionScale =
        "data-[state=closed]:scale-90 data-[state=open]:scale-100 starting:data-[state=closed]:scale-100 starting:data-[state=open]:scale-90";
</script>

<Popover autoFocus={false} onOpenChange={(e) => (open = e.open)} {open} positioning={{ placement }}>
    <Popover.Trigger element={trigger}></Popover.Trigger>
    <Portal>
        <Popover.Positioner class={zIndex}>
            <Popover.Content
                class="transition-all transition-discrete {transitionFade} {transitionScale}"
                element={content}
            ></Popover.Content>
        </Popover.Positioner>
    </Portal>
</Popover>
