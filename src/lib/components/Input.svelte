<script lang="ts">
    import type { HTMLInputAttributes } from "svelte/elements";
    import FieldShell from "./FieldShell.svelte";

    interface Props extends HTMLInputAttributes {
        icon?: string;
        error?: string;
        errors?: string[] | string;
        label?: string;
    }

    let { icon, error, errors, label, value = $bindable(), ...props }: Props = $props();
    const uid = $props.id();
    const id = $derived(props.id ?? uid);
    const errorText = $derived(error ?? (Array.isArray(errors) ? errors[0] : errors));
    const errorId = $derived(`${id}-error`);
    const describedBy = $derived(
        [props["aria-describedby"], errorText ? errorId : undefined].filter(Boolean).join(" ") || undefined
    );
</script>

{#snippet input()}
    <input
        {...props}
        {id}
        class={[icon ? "m3-field-input" : "m3-input", props.class, errorText && "m3-invalid"]}
        aria-describedby={describedBy}
        aria-invalid={errorText ? true : props["aria-invalid"]}
        bind:value
    />
{/snippet}

{#snippet field()}
    {#if icon}
        <FieldShell>
            {#snippet leading()}<iconify-icon aria-hidden="true" {icon}></iconify-icon>{/snippet}
            {@render input()}
        </FieldShell>
    {:else}
        {@render input()}
    {/if}
{/snippet}

{#if label}
    <label class="m3-label" for={id}>
        <span>{label}</span>
        {@render field()}
    </label>
{:else}
    {@render field()}
{/if}
{#if errorText}<p id={errorId} class="text-invalid" role="alert">{errorText}</p>{/if}
