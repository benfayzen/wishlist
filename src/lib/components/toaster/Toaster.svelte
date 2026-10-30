<script lang="ts">
    import { Toast } from "@skeletonlabs/skeleton-svelte";
    import { toaster } from ".";

    interface Props {
        yShift: number | undefined;
    }

    let { yShift }: Props = $props();
</script>

<Toast.Group style={yShift ? `bottom: ${yShift}px;` : undefined} {toaster}>
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
