<script lang="ts">
    import AppLogo from "./AppLogo.svelte";
    import NavMenu from "./NavMenu/NavMenu.svelte";
    import { isInstalled } from "$lib/stores/is-installed";
    import BackButton from "../BackButton.svelte";

    interface Props {
        user: LocalUser | null;
        groups: GroupInformation[] | null;
        isProxyUser: boolean;
        title?: string;
    }

    const { user, groups, isProxyUser, title }: Props = $props();
</script>

{#snippet wishlistHeader()}
    <div class="m3-header-logo"><AppLogo /></div>
{/snippet}

<div class="m3-nav">
    <!-- Header -->
    <div class="m3-header-leading">
        {#if user}
            {#if !$isInstalled}
                {@render wishlistHeader()}
            {:else}
                <BackButton header={wishlistHeader} iconOnly={!!title} />
            {/if}
        {:else}
            {@render wishlistHeader()}
        {/if}
        {#if title}
            <h1 class="m3-header-title" {title}><span>{title}</span></h1>
        {/if}
    </div>

    <!-- Trail -->
    <div class="m3-header-actions">
        <NavMenu {groups} {isProxyUser} {user} />
    </div>
</div>
