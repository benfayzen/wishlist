import { resolve } from "$app/paths";

export const navItems = [
    {
        labelKey: "navigation.overview",
        href: () => resolve("/lists"),
        icon: "material-symbols:home-rounded",
        outlinedIcon: "material-symbols:home-outline-rounded"
    },
    {
        labelKey: "navigation.lists",
        href: (user) => resolve("/lists") + (user ? "?" + new URLSearchParams({ users: user.id }).toString() : ""),
        icon: "material-symbols:featured-seasonal-and-gifts-rounded",
        outlinedIcon: "material-symbols:featured-seasonal-and-gifts-outline-rounded"
    },
    {
        labelKey: "navigation.claims",
        href: () => resolve("/claims"),
        icon: "material-symbols:bookmark-rounded",
        outlinedIcon: "material-symbols:bookmark-outline-rounded"
    }
] satisfies NavItem[];

export function isMyListsView(url: URL, user: Pick<LocalUser, "id"> | null): boolean {
    const users = url.searchParams.getAll("users");
    return !!user && users.length === 1 && users[0] === user.id;
}

/** Ignore sort/filter parameters when identifying a top-level destination. */
export function activeDestination(url: URL, user: LocalUser): string | undefined {
    if (url.pathname === "/claims" || url.pathname.startsWith("/claims/")) return "navigation.claims";
    if (url.pathname === "/lists" && isMyListsView(url, user)) return "navigation.lists";
    if (url.pathname === "/lists" || url.pathname.startsWith("/lists/") || url.pathname.startsWith("/items/"))
        return "navigation.overview";
    return undefined;
}
