<script lang="ts" module>
    import type { Snippet } from "svelte";

    interface ActionProps {
        neutralStyle: ClassValue;
        negativeStyle: ClassValue;
        positiveStyle: ClassValue;
    }

    export interface BaseModalProps extends DialogRootProps {
        trigger: NonNullable<DialogTriggerProps["element"]>;
        title: string;
        description: Snippet | string;
        actions: Snippet<[ActionProps]>;
        children?: Snippet;
        closeButtonLabel?: string;
    }

    const actionProps: ActionProps = {
        neutralStyle: "m3-secondary  m3-button m3-button-small md:m3-button",
        negativeStyle: "m3-danger-tonal  m3-button m3-button-small md:m3-button",
        positiveStyle: "m3-primary m3-button m3-button-small md:m3-button"
    };
</script>

<script lang="ts">
    import { Dialog, Portal, type DialogRootProps, type DialogTriggerProps } from "@skeletonlabs/skeleton-svelte";
    import ModalBackdrop from "./parts/ModalBackdrop.svelte";
    import ModalContent from "./parts/ModalContent.svelte";
    import type { ClassValue } from "svelte/elements";

    let {
        trigger,
        title,
        description,
        actions,
        children: content,
        closeButtonLabel,
        ...rest
    }: BaseModalProps = $props();
</script>

<Dialog {...rest}>
    <Dialog.Trigger element={trigger} />
    <Portal>
        <ModalBackdrop />

        <Dialog.Positioner class="fixed inset-0 z-50 mx-4 flex items-center justify-center">
            <ModalContent class="">
                <div class="m3-dialog-header">
                    <Dialog.Title class="m3-headline">
                        {title}
                    </Dialog.Title>
                    {#if closeButtonLabel}
                        <Dialog.CloseTrigger
                            class="m3-icon-button m3-dialog-close"
                            aria-label={closeButtonLabel}
                            title={closeButtonLabel}
                            type="button"
                        >
                            <iconify-icon aria-hidden="true" icon="ion:close"></iconify-icon>
                        </Dialog.CloseTrigger>
                    {/if}
                </div>
                <Dialog.Description class="m3-dialog-description">
                    {#if typeof description === "string"}
                        {@html description}
                    {:else}
                        {@render description()}
                    {/if}
                </Dialog.Description>

                {@render content?.()}

                <div class="m3-dialog-actions">
                    {@render actions(actionProps)}
                </div>
            </ModalContent>
        </Dialog.Positioner>
    </Portal>
</Dialog>
