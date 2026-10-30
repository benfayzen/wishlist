// https://github.com/sanrafa/sveltekit-sse-example/tree/main
import type EventEmitter from "node:events";
import type { BaseEventHandler } from "../../events";
import { logger } from "../logger";

export function createSSE(retry = 0, canReceive?: () => Promise<boolean>, mapData?: (data: unknown) => unknown) {
    const { readable, writable } = new TransformStream({
        start(ctr) {
            if (retry > 0) ctr.enqueue(`retry: ${retry}\n\n`);
        },
        transform({ event, data }, ctr) {
            let msg = data?.id ? `id: ${String(data.id)}\n` : ": hi\n\n";
            if (event) msg += `event: ${event}\n`;
            if (typeof data === "string") {
                msg += "data: " + data.trim().replace(/\n+/gm, "\ndata: ") + "\n\n";
            } else {
                msg += `data: ${JSON.stringify(data)}\n\n`;
            }
            ctr.enqueue(msg);
        }
    });

    const writer = writable.getWriter();

    return {
        readable,
        async subscribeToEvent<T>(emitter: EventEmitter, handler: BaseEventHandler<T, unknown>) {
            async function listener(data: T) {
                try {
                    if (handler.predicate(data) && (!canReceive || (await canReceive()))) {
                        const result = handler.handle(data);
                        await writer.write({ event: handler.getEventId(), data: mapData ? mapData(result) : result });
                    }
                } catch (err) {
                    logger.debug({ err }, "Live update skipped after disconnect or access change");
                }
            }
            emitter.on(handler.getEventId(), listener);
            await writer.closed.catch((err) => {
                if (err) logger.error({ err });
            });
            emitter.off(handler.getEventId(), listener);
        }
    };
}
