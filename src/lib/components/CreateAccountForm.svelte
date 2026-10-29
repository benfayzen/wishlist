<script lang="ts">
    import { page } from "$app/state";
    import PasswordInput from "$lib/components/PasswordInput.svelte";
    import { getFormatter } from "$lib/i18n";

    interface Props {
        hideActions?: boolean;
        signingIn?: boolean;
    }

    const { hideActions = false, signingIn = false }: Props = $props();
    const t = getFormatter();

    let data = $derived(page.data);
    let formData = $derived(page.form);

    let password = $state("");
    let passwordConfirm = $state("");
</script>

<div class="m3-card account-card">
    {#if data.id}
        <input id="tokenId" name="tokenId" class="hidden" value={data.id} />
    {/if}
    <label class="m3-label" for="name">
        <span>{$t("auth.name")}</span>
        <input
            id="name"
            name="name"
            class={["m3-input", formData?.errors?.name && "m3-invalid"]}
            autocomplete="name"
            required
            type="text"
        />
        {#if formData?.errors?.name}
            <span class="text-invalid">{formData.errors.name[0]}</span>
        {/if}
    </label>

    <label class="m3-label" for="username">
        <span>{$t("auth.username")}</span>
        <input
            id="username"
            name="username"
            class={["m3-input", formData?.errors?.username && "m3-invalid"]}
            autocapitalize="off"
            autocomplete="username"
            required
            type="text"
        />
        {#if formData?.errors?.username}
            <span class="text-invalid">{formData.errors.username[0]}</span>
        {/if}
    </label>
    <label class="m3-label" for="email">
        <span>{$t("auth.email")}</span>
        <input
            id="email"
            name="email"
            class={["m3-input", formData?.errors?.email && "m3-invalid"]}
            autocomplete="email"
            required
            type="email"
        />
        {#if formData?.errors?.email}
            <span class="text-invalid">{formData.errors.email[0]}</span>
        {/if}
    </label>

    <div class="flex min-w-0 flex-col gap-2">
        <PasswordInput
            id="password"
            name="password"
            autocomplete="new-password"
            label={$t("auth.password")}
            required
            strengthMeter
            bind:value={password}
        />
        {#if formData?.errors?.password}
            <span class="text-invalid">{formData.errors.password[0]}</span>
        {/if}
    </div>

    <div class="flex min-w-0 flex-col gap-2">
        <PasswordInput
            id="confirmpassword"
            autocomplete="new-password"
            label={$t("auth.confirm-password")}
            required
            bind:value={passwordConfirm}
        />
        {#if password !== passwordConfirm}
            <span class="text-invalid">{$t("auth.passwords-must-match")}</span>
        {/if}
    </div>

    {#if formData?.error && formData?.message}
        <span class="text-invalid">{formData.message}</span>
    {/if}

    {#if !hideActions}
        <button class="m3-primary m3-button w-full" disabled={password !== passwordConfirm || signingIn} type="submit">
            {#if signingIn}
                <span class="loading loading-spinner loading-xs"></span>
            {/if}
            <span>{$t("auth.create-account")}</span>
        </button>
    {/if}
</div>

<style>
    /* Product layout: one column keeps the registration fields aligned at every width. */
    .account-card {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: clamp(1.25rem, 4vw, 2rem);
    }
</style>
