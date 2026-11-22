<script lang="ts">
    import Oidc from "./OIDC.svelte";
    import Credentials from "./Credentials.svelte";
    import { getFormatter } from "$lib/i18n";

    interface Props {
        config: Pick<Config, "oidc" | "security" | "enableSignup">;
        envManagedKeys?: string[];
        hidden?: boolean;
    }

    const { config, envManagedKeys = [], hidden = false }: Props = $props();
    const t = getFormatter();
</script>

<div class={{ hidden, "flex flex-col gap-4": !hidden }}>
    <h2 class="m3-headline">{$t("admin.security")}</h2>
    <Credentials {config} {envManagedKeys} />
    <Oidc {config} {envManagedKeys} />
</div>
