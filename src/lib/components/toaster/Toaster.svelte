<script lang="ts">
    import { Toast } from "@skeletonlabs/skeleton-svelte";
    import { toaster } from ".";
    import { onMount } from "svelte";

    let container: HTMLDivElement;
    let bottomOffset = $state(16);
    let alignment = $state("center");

    onMount(() => {
        const shell = document.querySelector(".m3-app-shell");
        const observed = new Set<Element>();
        let frame = 0;
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(updatePosition);
        };
        const resizeObserver = new ResizeObserver(schedule);

        function updatePosition() {
            const footer = document.querySelector(".m3-navigation-footer");
            const fab = document.querySelector(".m3-page-fab");
            const toast = container.querySelector('[data-scope="toast"][data-part="root"][data-state="open"]');
            const targets = new Set([shell, footer, fab, toast].filter((element) => element !== null));
            for (const element of observed) {
                if (!targets.has(element)) {
                    resizeObserver.unobserve(element);
                    observed.delete(element);
                }
            }
            for (const element of targets) {
                if (!observed.has(element)) {
                    resizeObserver.observe(element);
                    observed.add(element);
                }
            }

            let offset = 16;
            const footerBounds = footer?.getBoundingClientRect();
            if (footerBounds?.height) offset = Math.max(offset, innerHeight - footerBounds.top + 16);

            // Prefer a position beside the FAB; lift the toast only on narrow screens.
            const fabBounds = fab?.getBoundingClientRect();
            const toastBounds = toast?.getBoundingClientRect();
            const groupBounds = toast?.parentElement?.getBoundingClientRect();
            alignment = "center";
            if (fabBounds?.width && toastBounds && groupBounds) {
                const centeredLeft = groupBounds.left + (groupBounds.width - toastBounds.width) / 2;
                const centeredRight = centeredLeft + toastBounds.width;
                if (centeredLeft < fabBounds.right + 16 && centeredRight > fabBounds.left - 16) {
                    if (toastBounds.width <= fabBounds.left - groupBounds.left - 16) {
                        alignment = "flex-start";
                    } else if (toastBounds.width <= groupBounds.right - fabBounds.right - 16) {
                        alignment = "flex-end";
                    } else {
                        offset = Math.max(offset, innerHeight - fabBounds.top + 16);
                    }
                }
            }
            bottomOffset = offset;
        }

        const observer = new MutationObserver(schedule);
        if (shell) observer.observe(shell, { childList: true, subtree: true });
        observer.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-state"]
        });
        window.addEventListener("resize", schedule);
        schedule();
        return () => {
            cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            observer.disconnect();
            window.removeEventListener("resize", schedule);
        };
    });
</script>

<div bind:this={container} class="contents">
    <Toast.Group
        style={`bottom: max(env(safe-area-inset-bottom, 0px), ${bottomOffset}px); align-items: ${alignment};`}
        {toaster}
    >
        {#snippet children(toast)}
            <Toast {toast}>
                <span class="m3-toast-icon" aria-hidden="true">
                    <iconify-icon
                        icon={toast.type === "error"
                            ? "ion:alert-circle"
                            : toast.type === "warning"
                              ? "ion:warning"
                              : "ion:checkmark-circle"}
                    ></iconify-icon>
                </span>
                <Toast.Message>
                    {#if toast.title}
                        <Toast.Title>{toast.title}</Toast.Title>
                    {/if}
                    <Toast.Description>{toast.description}</Toast.Description>
                </Toast.Message>
                <Toast.CloseTrigger />
            </Toast>
        {/snippet}
    </Toast.Group>
</div>
