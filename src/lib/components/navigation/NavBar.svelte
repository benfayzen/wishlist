<script lang="ts">
    import AppLogo from "./AppLogo.svelte";
    import NavMenu from "./NavMenu/NavMenu.svelte";

    interface Props {
        user: LocalUser | null;
        groups: GroupInformation[] | null;
        isProxyUser: boolean;
        title?: string;
    }

    const { user, groups, isProxyUser, title }: Props = $props();
</script>

<div class="m3-nav">
    <!-- Header -->
    <div class="m3-header-leading">
        <div class="m3-header-logo"><AppLogo /></div>
        {#if title}
            <h1 class="m3-header-title" {title}><span>{title}</span></h1>
        {/if}
    </div>

    <!-- Trail -->
    <div class="m3-header-actions">
        <NavMenu {groups} {isProxyUser} {user} />
    </div>
</div>
