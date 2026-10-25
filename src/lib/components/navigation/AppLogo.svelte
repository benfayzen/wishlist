<script lang="ts">
    import logo from "$lib/assets/wishlist-logo.png";
    import { getFormatter } from "$lib/i18n";

    const t = getFormatter();
</script>

<a class="m3-app-brand" href="/">
    <img class="m3-app-logo" alt={$t("a11y.wishlist-logo")} height="48" src={logo} width="48" />
</a>
