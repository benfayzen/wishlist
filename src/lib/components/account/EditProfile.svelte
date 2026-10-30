<script lang="ts">
    import { enhance } from "$app/forms";
    import { page } from "$app/state";
    import Avatar from "../Avatar.svelte";
    import { getFormatter } from "$lib/i18n";
    import FileUpload from "../FileUpload.svelte";
    import Input from "../Input.svelte";
    import { toaster } from "../toaster";

    interface Props {
        user: {
            name: string;
            username: string;
            email: string;
            picture?: string | null;
        };
        disabled?: boolean;
        autocomplete?: boolean;
    }

    const { user, disabled = false, autocomplete = true }: Props = $props();
    const t = getFormatter();

    let form = $derived(page.form);
    let selectedFiles: File[] = $state([]);
    let saving = $state(false);
</script>

<div class="m3-profile-editor">
    <div class="m3-profile-hero">
        <Avatar class="size-24 text-3xl md:size-28" {user} />
        <div class="m3-profile-hero-meta">
            <h2 class="m3-title">{user.name}</h2>
            <p class="subtext">@{user.username}</p>
            <div class="mt-2">
                <FileUpload
                    name="profilePic"
                    accept="image/*"
                    acceptedFiles={selectedFiles}
                    disabled={saving}
                    form="profile"
                    label={$t("general.update-profile-picture")}
                    onFileChange={({ acceptedFiles }) => (selectedFiles = acceptedFiles)}
                />
            </div>
        </div>
    </div>

    <form
        id="profile"
        class="m3-profile-form"
        action={disabled ? "?/profilePicture" : "?/profile"}
        enctype="multipart/form-data"
        method="POST"
        use:enhance={() => {
            saving = true;
            return async ({ result, update }) => {
                try {
                    if (result.type === "success") {
                        selectedFiles = [];
                        toaster.info({ description: $t("general.profile-updated") });
                    } else if (result.type === "error" || result.type === "failure") {
                        const message = result.type === "failure" ? result.data?.message : undefined;
                        toaster.error({ description: (message as string) || $t("general.oops") });
                    }
                    await update({ reset: false });
                } finally {
                    saving = false;
                }
            };
        }}
    >
        <Input
            id="name"
            name="name"
            autocomplete={autocomplete ? "name" : "off"}
            {disabled}
            errors={form?.errors?.name}
            icon="ion:person"
            label={$t("auth.name")}
            required
            value={user.name}
        />

        <Input
            id="username"
            name="username"
            autocomplete={autocomplete ? "username" : "off"}
            {disabled}
            errors={form?.errors?.username}
            icon="ion:at"
            label={$t("auth.username")}
            required
            value={user.username}
        />

        <Input
            id="email"
            name="email"
            autocomplete={autocomplete ? "email" : "off"}
            {disabled}
            errors={form?.errors?.email}
            icon="ion:mail"
            label={$t("auth.email")}
            required
            type="email"
            value={user.email}
        />

        {#if disabled}
            <p class="subtext">{$t("admin.profile-disabled")}</p>
        {/if}
        <div class="m3-profile-actions">
            <button
                class="m3-primary m3-button w-full sm:w-fit"
                disabled={saving || (disabled && selectedFiles.length === 0)}
                form="profile"
                type="submit"
            >
                <iconify-icon aria-hidden="true" icon="ion:checkmark"></iconify-icon>
                <span>{$t("general.save")}</span>
            </button>
        </div>
    </form>
</div>
