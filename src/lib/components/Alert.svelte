<script lang="ts">
    import type { Snippet } from "svelte";
    import type { ClassValue } from "svelte/elements";

    type AlertType = "info" | "warning" | "error";
    interface Props {
        title?: string | null;
        type: AlertType;
        children?: Snippet;
        actions?: Snippet<[ClassValue]>;
        noicon?: boolean;
        class?: string;
    }

    let { title = null, type, noicon = false, children, actions, class: clazz, ...rest }: Props = $props();

    const icon = $derived(type === "info" ? "ion:information-circle" : "ion:warning");
    const variant = $derived(
        type === "info" ? "m3-alert-info" : type === "warning" ? "m3-alert-warning" : "m3-alert-error"
    );

    const buttonVariant = $derived(
        type === "info" ? "m3-button m3-primary" : type === "warning" ? "m3-button m3-secondary" : "m3-button m3-danger"
    );
</script>

<aside class="alert mb-2 border {variant} {clazz}" {...rest}>
    {#if !noicon}
        <span class="alert-icon"><iconify-icon class="text-3xl md:text-4xl" {icon}></iconify-icon></span>
    {/if}
    <div class="alert-message flex flex-row items-center space-y-0 gap-x-4">
        <div>
            {#if title}
                <span class="font-bold md:text-lg">{title}</span>
            {/if}
            <p class="text-sm md:text-base">
                {@render children?.()}
            </p>
        </div>
    </div>
    {#if actions}
        <div class="alert-actions">
            {@render actions(buttonVariant)}
        </div>
    {/if}
</aside>
