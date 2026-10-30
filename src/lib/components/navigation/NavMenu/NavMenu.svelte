<script lang="ts">
    import { onMount } from "svelte";
    import { afterNavigate, invalidateAll } from "$app/navigation";
    import { Dialog, Portal } from "@skeletonlabs/skeleton-svelte";
    import { Role } from "$lib/schema";
    import Avatar from "../../Avatar.svelte";
    import GroupSubMenu from "./GroupSubMenu.svelte";
    import { getFormatter } from "$lib/i18n";
    import ChangeLanguageModal from "$lib/components/modals/ChangeLanguageModal.svelte";
    import LightSwitch from "./LightSwitch.svelte";

    interface Props {
        user: LocalUser | null;
        groups: GroupInformation[] | null;
        isProxyUser: boolean;
    }

    const { user, groups, isProxyUser }: Props = $props();
    const t = getFormatter();
    let open = $state(false);
    let interactive = $state(false);
    onMount(() => {
        interactive = true;
    });
    const closeMenu = () => {
        open = false;
    };
    afterNavigate(closeMenu);
</script>

{#if user}
    <div class="flex min-w-0 items-center gap-4">
        <Dialog onOpenChange={(event) => (open = event.open)} {open}>
            <Dialog.Trigger class="m3-avatar-trigger" disabled={!interactive}>
                <Avatar class="size-10 text-xs" {user} />
                <span class="sr-only">{$t("a11y.user-menu")}</span>
            </Dialog.Trigger>
            <Portal>
                <Dialog.Backdrop class="m3-account-backdrop" />
                <Dialog.Positioner class="m3-account-positioner">
                    <Dialog.Content class="m3-account-panel">
                        <header class="m3-account-header">
                            <Dialog.Title>{$t("admin.account")}</Dialog.Title>
                            <Dialog.CloseTrigger class="m3-icon-button m3-account-close" aria-label={$t("a11y.close")}>
                                <iconify-icon aria-hidden="true" icon="material-symbols:close-rounded"></iconify-icon>
                            </Dialog.CloseTrigger>
                        </header>
                        <nav
                            class="m3-account-body"
                            aria-label={$t("a11y.user-menu")}
                            data-testid="user menu navigation"
                        >
                            <div class="m3-account-identity">
                                <Avatar class="size-16 shrink-0 text-xl" {user} />
                                <div class="m3-account-details">
                                    <p class="m3-account-name">{user.name}</p>
                                    <p class="m3-account-email">{user.email || user.username}</p>
                                </div>
                            </div>
                            <ul class="m3-account-section">
                                <li>
                                    <a class="m3-account-action m3-account-primary" href="/account" onclick={closeMenu}>
                                        <iconify-icon
                                            aria-hidden="true"
                                            icon="material-symbols:manage-accounts-outline-rounded"
                                        ></iconify-icon>
                                        <span>{$t("admin.account")}</span>
                                        <iconify-icon
                                            class="m3-account-chevron"
                                            aria-hidden="true"
                                            icon="material-symbols:chevron-right-rounded"
                                        ></iconify-icon>
                                    </a>
                                </li>
                                {#if user.roleId == Role.ADMIN}
                                    <li>
                                        <a class="m3-account-action" href="/admin" onclick={closeMenu}>
                                            <iconify-icon
                                                aria-hidden="true"
                                                icon="material-symbols:admin-panel-settings-outline-rounded"
                                            ></iconify-icon>
                                            <span>{$t("admin.admin")}</span>
                                            <iconify-icon
                                                class="m3-account-chevron"
                                                aria-hidden="true"
                                                icon="material-symbols:chevron-right-rounded"
                                            ></iconify-icon>
                                        </a>
                                    </li>
                                {/if}
                            </ul>
                            <section aria-label={$t("admin.groups")}>
                                <h2 class="m3-account-section-title">{$t("admin.groups")}</h2>
                                <ul class="m3-account-section">
                                    <GroupSubMenu {groups} onSelect={closeMenu} />
                                </ul>
                            </section>
                            <section aria-label={$t("admin.settings")}>
                                <h2 class="m3-account-section-title">{$t("admin.settings")}</h2>
                                <div class="m3-account-section">
                                    <ChangeLanguageModal currentLanguage={user.preferredLanguage}>
                                        {#snippet trigger(props)}
                                            <button
                                                {...props}
                                                class="m3-account-action"
                                                onclick={(event) => {
                                                    closeMenu();
                                                    props.onclick?.(event);
                                                }}
                                                type="button"
                                            >
                                                <iconify-icon
                                                    aria-hidden="true"
                                                    icon="material-symbols:language-rounded"
                                                ></iconify-icon>
                                                <span>{$t("general.language")}</span>
                                                <iconify-icon
                                                    class="m3-account-chevron"
                                                    aria-hidden="true"
                                                    icon="material-symbols:chevron-right-rounded"
                                                ></iconify-icon>
                                            </button>
                                        {/snippet}
                                    </ChangeLanguageModal>
                                    <div class="m3-account-appearance">
                                        <LightSwitch />
                                    </div>
                                </div>
                            </section>
                            {#if !isProxyUser}
                                <button
                                    class="m3-account-action m3-account-signout"
                                    onclick={async () => {
                                        closeMenu();
                                        await fetch("/logout", { method: "POST" });
                                        invalidateAll();
                                    }}
                                    type="button"
                                >
                                    <iconify-icon
                                        aria-hidden="true"
                                        icon="material-symbols:logout-rounded"
                                    ></iconify-icon>
                                    <span>{$t("auth.sign-out")}</span>
                                </button>
                            {/if}
                        </nav>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog>
    </div>
{:else}
    <LightSwitch showLabel={false} />
{/if}
