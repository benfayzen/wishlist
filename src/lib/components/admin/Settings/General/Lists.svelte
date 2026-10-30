<script lang="ts">
    import SettingsGroup from "../SettingsGroup.svelte";
    import Setting from "../Setting.svelte";
    import { getFormatter } from "$lib/i18n";

    interface Props {
        config: Pick<Config, "enableDefaultListCreation" | "allowPublicLists" | "listMode">;
    }

    const { config }: Props = $props();
    const t = getFormatter();
</script>

<SettingsGroup title={$t("wishes.lists")}>
    <Setting>
        <label class="checkbox-label">
            <input
                id="enableDefaultListCreation"
                name="enableDefaultListCreation"
                class="checkbox"
                checked={config.enableDefaultListCreation}
                type="checkbox"
            />
            <span>{$t("admin.enable-default-list-creation")}</span>
        </label>

        {#snippet description()}
            {$t("admin.enable-default-list-creation-tooltip")}
        {/snippet}
    </Setting>

    <Setting>
        <label class="checkbox-label">
            <input
                id="allowPublicLists"
                name="allowPublicLists"
                class="checkbox"
                checked={config.allowPublicLists}
                onchange={(e) => (config.allowPublicLists = e.currentTarget.checked)}
                type="checkbox"
            />
            <span>{$t("admin.allow-public-lists")}</span>
        </label>

        {#snippet description()}
            {$t("admin.allow-public-lists-tooltip")}
        {/snippet}
    </Setting>
</SettingsGroup>
