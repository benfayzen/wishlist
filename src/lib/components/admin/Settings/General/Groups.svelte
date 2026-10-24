<script lang="ts">
    import Select from "$lib/components/Select.svelte";
    import type { Group } from "$lib/generated/prisma/client";
    import SettingsGroup from "../SettingsGroup.svelte";
    import Setting from "../Setting.svelte";
    import { getFormatter } from "$lib/i18n";

    interface Props {
        config: Pick<Config, "defaultGroup">;
        groups: Group[];
    }

    const { config, groups }: Props = $props();
    const t = getFormatter();
</script>

<SettingsGroup title={$t("admin.groups")}>
    <Setting>
        <label class="m3-label flex flex-col" for="defaultGroup">
            <span>{$t("admin.default-group")}</span>
            <Select
                id="defaultGroup"
                name="defaultGroup"
                class="m3-select w-full max-w-md"
                value={config.defaultGroup || ""}
            >
                <option class="truncate" value="">{$t("admin.select-a-group-option")}</option>
                {#each groups as group}
                    <option value={group.id}>{group.name}</option>
                {/each}
            </Select>
        </label>

        {#snippet description()}
            {$t("admin.default-group-tooltip")}
        {/snippet}
    </Setting>
</SettingsGroup>
