<script lang="ts">
    import type { Group } from "$lib/generated/prisma/client";
    import Suggestions from "./Suggestions.svelte";
    import Claims from "./Claims.svelte";
    import Lists from "./Lists.svelte";
    import Groups from "./Groups.svelte";
    import { getFormatter } from "$lib/i18n";

    interface Props {
        config: Pick<
            Config,
            "claims" | "defaultGroup" | "suggestions" | "enableDefaultListCreation" | "listMode" | "allowPublicLists"
        >;
        groups: Group[];
        hidden?: boolean;
        forGroup?: boolean;
        groupUserCount?: number;
        listCount?: number;
    }

    const { config, groups, hidden = false, forGroup = false }: Props = $props();
    const t = getFormatter();
</script>

<div class={{ hidden, "flex flex-col gap-4": !hidden }}>
    <h2 class="m3-headline">{$t("admin.general")}</h2>

    <Suggestions {config} />

    <Claims {config} />

    <Lists {config} />

    {#if !forGroup}
        <Groups {config} {groups} />
    {/if}
</div>
