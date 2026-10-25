import { browser } from "$app/environment";
import { fade as nativeFade, scale as nativeScale } from "svelte/transition";

export const motionDuration = (duration: number) =>
    browser && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : duration;
export const fade: typeof nativeFade = (node, options = {}) =>
    nativeFade(node, {
        ...options,
        duration: motionDuration(options.duration ?? 400),
        delay: motionDuration(options.delay ?? 0)
    });
export const scale: typeof nativeScale = (node, options = {}) =>
    nativeScale(node, {
        ...options,
        duration: motionDuration(options.duration ?? 400),
        delay: motionDuration(options.delay ?? 0)
    });
