<script lang="ts">
    interface Props {
        label: string;
        options: { value: string; label: string; icon: string; selectedIcon?: string }[];
        value: string;
        onchange: (value: string) => void;
        showLabels?: boolean;
    }

    const { label, options, value, onchange, showLabels = false }: Props = $props();
</script>

<div class="m3-connected-group" class:has-labels={showLabels} aria-label={label} role="group">
    {#each options as option (option.value)}
        <button
            class="m3-connected-button"
            aria-label={option.label}
            aria-pressed={value === option.value}
            onclick={() => onchange(option.value)}
            title={option.label}
            type="button"
        >
            <span class="m3-connected-button-surface">
                <iconify-icon
                    aria-hidden="true"
                    icon={value === option.value ? option.selectedIcon || option.icon : option.icon}
                ></iconify-icon>
                {#if showLabels}<span>{option.label}</span>{/if}
            </span>
        </button>
    {/each}
</div>
