<script lang="ts">
    import { goto } from "$app/navigation";
    import Search from "../Search.svelte";
    import InviteUser from "./InviteUser.svelte";
    import type { Group } from "$lib/generated/prisma/client";
    import { enhance } from "$app/forms";
    import { getFormatter } from "$lib/i18n";

    type User = {
        id: string;
        username: string;
        name: string;
        email?: string;
        isAdmin: boolean;
    };

    type UserWithGroups = User & { groups?: string[] };

    interface Props {
        users: UserWithGroups[];
        currentUser: User;
        config: Config;
        groups: Group[];
    }

    const { users, currentUser, config, groups }: Props = $props();
    const t = getFormatter();

    const headers = [$t("auth.name"), $t("auth.username"), $t("auth.email"), $t("admin.admin"), $t("admin.groups")];

    let usersFiltered: UserWithGroups[] = $derived(users);

    const selectionHandler = (user: User) => {
        goto(user.username === currentUser.username ? "/account" : `/admin/users/${user.id}`);
    };
</script>

<div class="admin-section-heading">
    <h2 class="m3-headline">{$t("admin.users")}</h2>
    <span class="admin-count">{usersFiltered.length}</span>
</div>

<div class="admin-toolbar">
    <Search data={users} keys={["name", "username", "email"]} bind:result={usersFiltered} />
    <form method="POST" use:enhance>
        <InviteUser {config} {groups} />
    </form>
</div>

<ul class="admin-records admin-mobile-records" aria-label={$t("admin.users")}>
    {#each usersFiltered as user (user.id)}
        <li>
            <a
                class="admin-record admin-record-link"
                href={user.username === currentUser.username ? "/account" : `/admin/users/${user.id}`}
            >
                <div class="admin-record-heading">
                    <div class="admin-identity">
                        <span class="admin-record-name">{user.name}</span>
                        <span class="admin-record-meta">@{user.username}</span>
                    </div>
                    <iconify-icon aria-hidden="true" icon="ion:chevron-forward"></iconify-icon>
                </div>
                {#if user.email}<span class="admin-record-meta">{user.email}</span>{/if}
                {#if user.isAdmin || user.groups?.length}
                    <div class="admin-record-tags">
                        {#if user.isAdmin}<span class="admin-role">{$t("admin.admin")}</span>{/if}
                        {#each user.groups?.toSorted() ?? [] as group}<span class="admin-tag">{group}</span>{/each}
                    </div>
                {/if}
            </a>
        </li>
    {/each}
</ul>

<div class="admin-desktop-table table-wrap preset-outlined-surface-200-800 rounded-container">
    <table class="table-hover table">
        <thead>
            <tr>
                {#each headers as header}
                    <th>{header}</th>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each usersFiltered as user}
                <tr onclick={() => selectionHandler(user)}>
                    <td>
                        <a
                            class="anchor"
                            href={user.username === currentUser.username ? "/account" : `/admin/users/${user.id}`}
                            onclick={(event) => event.stopPropagation()}
                        >
                            {user.name}
                        </a>
                    </td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td class="text-center">
                        {#if user.isAdmin}
                            <iconify-icon class="text-lg" icon="ion:checkmark"></iconify-icon>
                        {/if}
                    </td>
                    <td class="flex flex-wrap gap-1">
                        {#each user.groups?.toSorted() as group}
                            <span class="badge preset-tonal-secondary inset-ring-secondary-500 inset-ring">
                                {group}
                            </span>
                        {/each}
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

{#if usersFiltered.length === 0}<p class="admin-empty" role="status">{$t("general.no-results")}</p>{/if}
