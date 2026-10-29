<script lang="ts">
    import { enhance } from "$app/forms";
    import { page } from "$app/state";
    import PasswordInput from "$lib/components/PasswordInput.svelte";
    import type { PageProps } from "./$types";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import Alert from "$lib/components/Alert.svelte";
    import { getFormatter } from "$lib/i18n";
    import { resolve } from "$app/paths";
    import { toaster } from "$lib/components/toaster";

    const { data, form }: PageProps = $props();
    const t = getFormatter();

    let signingIn = $state(false);
    let oAuthError: Record<string, string> | undefined = $state();
    onMount(async () => {
        if (data.isCallback) {
            const resp = await fetch("/login/oidc/callback", {
                method: "POST",
                body: JSON.stringify({ url: page.url })
            });
            if (!resp.ok) {
                oAuthError = await resp.json();
                goto(
                    resolve("/login") +
                        "?" +
                        new URLSearchParams({ error: oAuthError?.message || $t("general.oops") }).toString()
                );
            } else if (resp.redirected) {
                goto(resp.url, { invalidateAll: true });
            }
        }
    });
</script>

<div class="login-page">
    <h1 class="m3-page-title capitalize">{$t("auth.sign-in")}</h1>

    <form
        class="w-full"
        aria-busy={signingIn || data.isCallback}
        method="POST"
        use:enhance={(form) => {
            signingIn = true;
            return async ({ result, update }) => {
                signingIn = false;

                if (result.type === "failure") {
                    form.formElement.reset();
                } else if (result.type === "error") {
                    toaster.error({ description: result.error });
                }
                await update();
            };
        }}
    >
        <div class="m3-card login-card">
            {#if data.isCallback}
                <div class="flex flex-col items-center justify-center space-y-4">
                    <span class="loading loading-spinner w-8 md:w-12"></span>
                    <span class="text-lg md:text-xl">{$t("auth.authenticating")}</span>
                </div>
            {:else}
                {#if data.enableLogin}
                    <label class="m3-label" for="username">
                        <span>{$t("auth.username")}</span>
                        <input
                            id="username"
                            name="username"
                            class={["m3-input", (form?.incorrect || form?.error) && "m3-invalid"]}
                            autocapitalize="off"
                            autocomplete="username"
                            required
                            type="text"
                        />
                        {#if form?.errors?.username}
                            <span class="text-invalid">
                                {form.errors.username[0]}
                            </span>
                        {/if}
                    </label>

                    <div class="flex min-w-0 flex-col gap-2">
                        <PasswordInput
                            id="password"
                            name="password"
                            autocomplete="current-password"
                            error={form?.incorrect || form?.error}
                            label={$t("auth.password")}
                            required
                        />

                        {#if form?.incorrect}
                            <span class="text-invalid">
                                {$t("errors.invalid-credentials")}
                            </span>
                        {/if}
                        {#if form?.errors?.password}
                            <span class="text-invalid">
                                {form.errors.password[0]}
                            </span>
                        {/if}

                        <a class="anchor login-recovery" href="/forgot-password">
                            {$t("auth.forgot-password")}
                        </a>
                    </div>

                    <button class="m3-primary m3-button w-full" disabled={signingIn} type="submit">
                        {#if signingIn}
                            <span class="loading loading-spinner loading-xs"></span>
                        {/if}
                        <span>{$t("auth.sign-in")}</span>
                    </button>
                {/if}
                {#if data.oidcConfig?.ready}
                    {#if data.enableLogin}
                        <div class="login-divider">
                            <span>{$t("auth.or")}</span>
                        </div>
                    {/if}
                    <button
                        class={["m3-button w-full", data.enableLogin ? "m3-outlined" : "m3-primary"]}
                        disabled={signingIn}
                        onclick={() => window.location.assign(`/login/oidc${page.url.search}`)}
                        type="button"
                    >
                        {$t("auth.sign-in-with", { values: { provider: data.oidcConfig.providerName || "OAuth" } })}
                    </button>
                {/if}
            {/if}
        </div>
    </form>
    {#if !data.isCallback && data.enableLogin && data.enableSignup}
        <a class="m3-button m3-text-button" href="/signup">{$t("auth.create-an-account")}</a>
    {/if}
    {#if data.error}
        <Alert class="w-full" noicon title={$t("errors.oidc-error")} type="error">
            <pre class="text-wrap">{data.error}</pre>
        </Alert>
    {/if}
</div>

<svelte:head>
    <title>{$t("auth.sign-in")}</title>
</svelte:head>

<style>
    /* Product layout: group credentials and give the primary action a consistent width. */
    .login-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
        inline-size: min(100%, 28rem);
        margin-inline: auto;
    }

    .login-card {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: clamp(1.25rem, 4vw, 2rem);
    }

    .login-recovery {
        display: flex;
        align-items: center;
        align-self: flex-end;
        min-block-size: var(--md-target-size);
        max-inline-size: 100%;
        font-size: 0.875rem;
        text-align: end;
    }

    .login-divider {
        display: flex;
        align-items: center;
        gap: 1rem;
        color: var(--md-on-surface-variant);
        font-size: 0.875rem;
    }

    .login-divider::before,
    .login-divider::after {
        content: "";
        flex: 1;
        block-size: 1px;
        background: var(--md-outline-variant);
    }
</style>
