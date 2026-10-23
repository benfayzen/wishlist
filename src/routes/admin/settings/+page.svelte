<script lang="ts">
    import Select from "$lib/components/Select.svelte";
    import { enhance } from "$app/forms";
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { Email, General, Security, options } from "$lib/components/admin/Settings";
    import { onMount } from "svelte";
    import type { PageProps } from "./$types";
    import { getFormatter } from "$lib/i18n";
    import { toaster } from "$lib/components/toaster";

    let { data }: PageProps = $props();
    const t = getFormatter();

    onMount(() => {
        if (!page.url.hash) {
            goto(options[0].hash);
        }
    });

    const currentHash = $derived(page.url.hash);
    let { config, groups } = $derived(data);
    let sending = $state(false);
    let saving = $state(false);
    let saved = $state(false);
</script>

<form
    action="?/settings"
    method="POST"
    oninput={() => (saved = false)}
    use:enhance={({ action }) => {
        if (action.search.endsWith("?/send-test")) {
            sending = true;
        } else {
            saved = false;
            saving = true;
        }
        return ({ action, result }) => {
            if (action.search.endsWith("?/settings") && result.type === "success") {
                saving = false;
                saved = true;
                toaster.info({ description: $t("admin.settings-saved-toast") });
            }
            if (action.search.endsWith("?/send-test") && result.type === "success") {
                sending = false;
                if (!result.data?.success) {
                    const description: string = result.data?.message
                        ? (result.data.message as string)
                        : $t("errors.something-went-wrong");
                    toaster.error({ description });
                } else {
                    toaster.info({ description: $t("admin.test-email-sent-toast") });
                }
            }
        };
    }}
>
    <div class="flex w-full flex-col gap-4 md:flex-row">
        <!-- Sidebar nav for larger screens -->
        <aside class="hidden md:block md:w-1/3 lg:w-1/4">
            <nav class="list-nav">
                <ul>
                    {#each options as option}
                        <li>
                            <a class={[currentHash === option.hash && "preset-filled-primary-500!"]} href={option.hash}>
                                {option.label($t)}
                            </a>
                        </li>
                    {/each}
                </ul>
            </nav>
        </aside>
        <!-- Select nav for small screens -->
        <aside class="w-full md:hidden">
            <Select class="m3-select w-full" onchange={(e) => goto(e.currentTarget.value)} value={currentHash}>
                {#each options as option}
                    <option value={option.hash}>{option.label($t)}</option>
                {/each}
            </Select>
        </aside>
        <!-- Settings -->
        <div class="w-full">
            <General {config} {groups} hidden={currentHash !== options[0].hash} />
            <Email {config} hidden={currentHash !== options[1].hash} {sending} />
            <Security {config} hidden={currentHash !== options[2].hash} />

            {#if page.form?.error}
                <span>{page.form.error}</span>
            {/if}

            <!-- Save buttons -->
            <div class="flex w-full flex-wrap items-center justify-end gap-3 pt-5">
                <span role="status">
                    {#if saved}{$t("admin.settings-saved-toast")}{/if}
                </span>
                <button class="m3-primary m3-button" disabled={saving} type="submit">
                    {#if saving}
                        <span class="loading loading-spinner loading-xs"></span>
                    {/if}
                    <span>{$t("general.save")}</span>
                </button>
            </div>
        </div>
    </div>
</form>
