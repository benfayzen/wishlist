import { itemEmitter } from "$lib/server/events/emitters";
import { createSSE } from "$lib/server/events/sse";
import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { getConfig } from "$lib/server/config";
import { getFormatter } from "$lib/server/i18n";
import { getById } from "$lib/server/list";
import { getListMembership } from "$lib/server/list-sharing";
import { visibleClaims } from "$lib/server/claim-visibility";
import type { ItemOnListDTO } from "$lib/dtos/item-dto";
import { ItemCreateHandler, ItemDeleteHandler, ItemsUpdateHandler, ItemUpdateHandler } from "$lib/events";

export const GET = (async ({ locals, params }) => {
    const $t = await getFormatter();

    const list = await getById(params.id);
    const config = await getConfig(list?.groupId);
    if (!locals.user) {
        // Unauthenticated users can only view public lists
        if (!list || !list.public) {
            // Redirect to login so we don't expose details if the list does exist
            return new Response();
        }
    } else {
        // Logged in users must be in the correct group, or viewing a public list
        if (
            !list ||
            (!list.public && list.owner.id !== locals.user.id && !(await getListMembership(list, locals.user.id)))
        ) {
            error(404, $t("errors.list-not-found"));
        }
    }

    // don't do updates on the list owners page for surprise mode since an item could be added that the owner shouldn't see
    if (
        config.suggestions.enable &&
        config.suggestions.method === "surprise" &&
        locals.user &&
        (list.owner.id === locals.user.id || list.managers.find(({ userId }) => userId === locals.user!.id)) &&
        !(list.allowSelfClaims || list.notForMe)
    ) {
        return new Response();
    }

    const membership = locals.user ? await getListMembership(list, locals.user.id) : undefined;
    const { readable, subscribeToEvent } = createSSE(
        0,
        async () => {
            const current = await getById(params.id);
            if (!current) return false;
            if (current.public || current.owner.id === locals.user?.id) return true;
            if (!locals.user) return false;
            return !!(await getListMembership(current, locals.user.id));
        },
        (data) => {
            if (data && typeof data === "object" && "claims" in data && "userId" in data) {
                return visibleClaims(
                    data as ItemOnListDTO,
                    config,
                    locals.user?.id,
                    membership?.groupId,
                    list.notForMe
                );
            }
            return data;
        }
    );

    subscribeToEvent(itemEmitter, new ItemUpdateHandler(params.id));
    subscribeToEvent(itemEmitter, new ItemCreateHandler(params.id));
    subscribeToEvent(itemEmitter, new ItemDeleteHandler(params.id));
    subscribeToEvent(itemEmitter, new ItemsUpdateHandler(params.id));

    return new Response(readable, {
        headers: {
            "Cache-Control": "no-cache",
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no"
        }
    });
}) satisfies RequestHandler;
