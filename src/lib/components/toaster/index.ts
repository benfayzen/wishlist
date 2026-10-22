import { createToaster } from "@skeletonlabs/skeleton-svelte";

const store = createToaster({ max: 1, overlap: false, duration: 6000, pauseOnPageIdle: true });
// New feedback replaces stale feedback; users never wait behind an old notification.
export const toaster = {
    ...store,
    info(data: Parameters<typeof store.info>[0]) {
        store.remove();
        store.info(data);
    },
    success(data: Parameters<typeof store.success>[0]) {
        store.remove();
        store.success(data);
    },
    warning(data: Parameters<typeof store.warning>[0]) {
        store.remove();
        store.warning(data);
    },
    error(data: Parameters<typeof store.error>[0]) {
        store.remove();
        store.error(data);
    },
    loading(data: Parameters<typeof store.loading>[0]) {
        store.remove();
        store.loading(data);
    },
    promise<T>(
        promise: Promise<T> | (() => Promise<T>),
        options: Parameters<typeof store.promise<T>>[1],
        shared?: Parameters<typeof store.promise<T>>[2]
    ) {
        store.remove();
        return store.promise(promise, options, shared);
    }
};
