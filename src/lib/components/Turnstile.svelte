<script lang="ts">
    import { onMount } from "svelte";
    import { getFormatter } from "$lib/i18n";

    interface TurnstileApi {
        render: (element: HTMLElement, options: Record<string, unknown>) => string;
        remove: (id: string) => void;
    }
    let { siteKey, verified = $bindable(false) }: { siteKey: string; verified?: boolean } = $props();
    const t = getFormatter();
    let container: HTMLDivElement;
    let failed = $state(false);
    let token = $state("");

    onMount(() => {
        let disposed = false;
        let widget: string | undefined;
        let api: TurnstileApi | undefined;
        const showError = () => {
            token = "";
            verified = false;
            failed = true;
        };
        const render = () => {
            if (disposed || widget !== undefined) return;
            api = (window as Window & { turnstile?: TurnstileApi }).turnstile;
            if (!api) {
                showError();
                return;
            }
            widget = api.render(container, {
                sitekey: siteKey,
                action: "signup",
                size: "flexible",
                theme: "auto",
                "response-field": false,
                callback: (value: string) => {
                    token = value;
                    verified = true;
                    failed = false;
                },
                "expired-callback": () => {
                    token = "";
                    verified = false;
                },
                "error-callback": showError,
                "timeout-callback": showError
            });
        };
        let script = document.querySelector<HTMLScriptElement>(
            'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]'
        );
        if ((window as Window & { turnstile?: TurnstileApi }).turnstile) render();
        else {
            if (!script) {
                script = document.createElement("script");
                script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
            }
            script.addEventListener("load", render);
            script.addEventListener("error", showError);
        }
        const timeout = setTimeout(() => {
            if (!verified) showError();
        }, 30000);
        return () => {
            disposed = true;
            verified = false;
            clearTimeout(timeout);
            script?.removeEventListener("load", render);
            script?.removeEventListener("error", showError);
            if (widget !== undefined) api?.remove(widget);
        };
    });
</script>

<div class="turnstile-check">
    <div bind:this={container}></div>
    <input name="cf-turnstile-response" type="hidden" value={token} />
    {#if failed}
        <span class="text-invalid" role="alert">{$t("errors.registration-protection-unavailable")}</span>
    {/if}
    <noscript><span class="text-invalid">{$t("auth.registration-javascript-required")}</span></noscript>
</div>

<style>
    .turnstile-check {
        min-inline-size: 0;
    }
</style>
