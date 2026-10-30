<script lang="ts">
    import ChangePassword from "$lib/components/account/ChangePassword.svelte";
    import EditProfile from "$lib/components/account/EditProfile.svelte";
    import LinkOAuth from "$lib/components/account/LinkOAuth.svelte";
    import Tabs from "$lib/components/Tabs.svelte";
    import type { PageProps } from "./$types";
    import { getFormatter } from "$lib/i18n";

    const { data }: PageProps = $props();
    const t = getFormatter();

    let profileEditDisabled = $derived(
        data.oidcConfig.ready && data.oidcConfig.enableSync === true && data.user.oauthId !== null
    );
</script>

<div class="m3-account-shell">
    <header class="m3-account-page-header">
        <h1 class="m3-page-title">{$t("admin.account")}</h1>
        <a class="m3-secondary m3-button" href="/account/groups">
            <iconify-icon aria-hidden="true" icon="ion:people"></iconify-icon>
            <span>{$t("admin.groups")}</span>
        </a>
    </header>

    <Tabs
        defaultValue="profile"
        tabs={[
            { id: "profile", label: $t("admin.profile") },
            { id: "security", label: $t("admin.security") }
        ]}
    >
        {#snippet content({ value: tabValue })}
            {#if tabValue === "profile"}
                <div class="m3-account-panel">
                    <div class="m3-card m3-account-card">
                        <EditProfile disabled={profileEditDisabled} user={data.user} />
                    </div>
                </div>
            {:else if tabValue === "security"}
                <div class="m3-account-panel m3-account-security-grid">
                    <section class="m3-card m3-account-card">
                        <ChangePassword />
                    </section>
                    {#if data.oidcConfig.ready}
                        <section class="m3-card m3-account-card">
                            <LinkOAuth oauthId={data.user.oauthId} providerName={data.oidcConfig.providerName} />
                        </section>
                    {/if}
                </div>
            {/if}
        {/snippet}
    </Tabs>
</div>

<svelte:head>
    <title>{$t("admin.account")}</title>
</svelte:head>
