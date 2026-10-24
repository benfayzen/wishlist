<script lang="ts">
    import { enhance } from "$app/forms";
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { Email, General, Security, options } from "$lib/components/admin/Settings";
    import type { PageProps } from "./$types";
    import { getFormatter } from "$lib/i18n";
    import { toaster } from "$lib/components/toaster";

    let { data }: PageProps = $props();
    const t = getFormatter();

    const currentHash = $derived(
        options.some((option) => option.hash === page.url.hash) ? page.url.hash : options[0].hash
    );
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
        return ({ action, result, update }) => {
            saving = false;
            sending = false;
            if (action.search.endsWith("?/settings") && result.type === "success") {
                saved = true;
                toaster.info({ description: $t("admin.settings-saved-toast") });
            }
            if (action.search.endsWith("?/send-test") && result.type === "success") {
                if (!result.data?.success) {
                    const description: string = result.data?.message
                        ? (result.data.message as string)
                        : $t("errors.something-went-wrong");
                    toaster.error({ description });
                } else {
                    toaster.info({ description: $t("admin.test-email-sent-toast") });
                }
            }
            if (result.type === "failure" || result.type === "error") {
                toaster.error({ description: $t("errors.something-went-wrong") });
            }
            if (result.type === "failure" || result.type === "redirect") {
                update({ reset: false, invalidateAll: false });
            }
        };
    }}
>
    <div class="admin-settings-layout">
        <nav class="admin-settings-navigation" aria-label={$t("admin.settings")}>
            {#each options as option}
                <a
                    aria-current={currentHash === option.hash ? "page" : undefined}
                    href={option.hash}
                    onclick={(event) => {
                        event.preventDefault();
                        goto(option.hash, { noScroll: true, keepFocus: true });
                    }}
                >
                    {option.label($t)}
                </a>
            {/each}
        </nav>
        <!-- Settings -->
        <div class="admin-settings-body">
            <General {config} {groups} hidden={currentHash !== options[0].hash} />
            <Email {config} hidden={currentHash !== options[1].hash} {sending} />
            <Security {config} hidden={currentHash !== options[2].hash} />

            {#if page.form?.error}
                <span>{page.form.error}</span>
            {/if}

            <!-- Save buttons -->
            <div class="admin-save-actions">
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
