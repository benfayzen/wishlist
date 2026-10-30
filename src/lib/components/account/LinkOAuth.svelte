<script lang="ts">
    import { enhance } from "$app/forms";
    import { getFormatter } from "$lib/i18n";

    interface Props {
        providerName?: string | null;
        oauthId?: string | null;
    }

    const { providerName: providerName_, oauthId }: Props = $props();
    const t = getFormatter();

    const providerName = $derived(providerName_ || $t("general.oauth"));

    const authenticate = () => {
        window.location.assign("/login/oidc");
    };
</script>

<form class="flex flex-col gap-4" method="POST" use:enhance>
    <div class="flex flex-col gap-1">
        <h3 class="h3">{$t("admin.sso")}</h3>
        <p class="subtext">{providerName || $t("general.oauth")}</p>
    </div>
    {#if oauthId}
        <button class="m3-secondary m3-button w-full sm:w-fit" formaction="?/unlinkoauth">
            {$t("auth.unlink-oauth", { values: { providerName: providerName || $t("general.oauth") } })}
        </button>
    {:else}
        <button class="m3-primary m3-button w-full sm:w-fit" onclick={() => authenticate()} type="button">
            {$t("auth.link-oauth", { values: { providerName: providerName || $t("general.oauth") } })}
        </button>
    {/if}
</form>
