<script lang="ts">
    import type { HTMLInputAttributes } from "svelte/elements";
    import FieldShell from "./FieldShell.svelte";
    interface Props extends HTMLInputAttributes {
        icon?: string;
        error?: string;
    }
    let { icon, error, value = $bindable(), ...props }: Props = $props();
    const uid = $props.id();
    const id = $derived(props.id ?? uid);
    const errorId = $derived(`${id}-error`);
    const describedBy = $derived(
        [props["aria-describedby"], error ? errorId : undefined].filter(Boolean).join(" ") || undefined
    );
</script>

{#snippet input()}
    <input
        {...props}
        {id}
        class={[icon ? "m3-field-input" : "m3-input", props.class, error && "m3-invalid"]}
        aria-describedby={describedBy}
        aria-invalid={error ? true : props["aria-invalid"]}
        bind:value
    />
{/snippet}
{#if icon}
    <FieldShell>
        {#snippet leading()}<iconify-icon aria-hidden="true" {icon}></iconify-icon>{/snippet}
        {@render input()}
    </FieldShell>
{:else}{@render input()}{/if}
{#if error}<p id={errorId} class="text-invalid" role="alert">{error}</p>{/if}
