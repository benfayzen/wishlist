<script lang="ts">
    import { enhance } from "$app/forms";
    import { onMount } from "svelte";
    import type { PageProps } from "./$types";
    import CreateAccountForm from "$lib/components/CreateAccountForm.svelte";
    import { getFormatter } from "$lib/i18n";

    const { data }: PageProps = $props();
    const t = getFormatter();

    onMount(() => {
        if (data.valid) window.history.replaceState({}, "", "/signup");
    });

    let signingIn = $state(false);
</script>

<div class="signup-page">
    <h1 class="m3-page-title capitalize">{$t("auth.create-account")}</h1>

    <form
        class="w-full"
        aria-busy={signingIn}
        method="POST"
        use:enhance={() => {
            signingIn = true;
            return async ({ update }) => {
                signingIn = false;
                return update();
            };
        }}
    >
        <CreateAccountForm {signingIn} />
    </form>
    <a class="m3-button m3-text-button" href="/login">{$t("auth.sign-in")}</a>
</div>

<svelte:head>
    <title>{$t("auth.create-an-account")}</title>
</svelte:head>

<style>
    /* Match the login page's width and separate account actions from the form. */
    .signup-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
        inline-size: min(100%, 28rem);
        margin-inline: auto;
    }
</style>
