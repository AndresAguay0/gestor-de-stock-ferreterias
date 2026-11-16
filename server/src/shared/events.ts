import { EventEmitter } from "node:events";

export interface StockChangedEvent {
    productId: number;
    storeId: number;
    previousQuantity: number;
    quantity: number;
    minQuantity: number;
    movementId: number;
    userId: number;
}

interface EventMap {
    "stock.changed": [event: StockChangedEvent];
}

type Listener<K extends keyof EventMap> = (...args: EventMap[K]) => void | Promise<void>;

export class EventBus {
    private readonly emitter = new EventEmitter();

    on<K extends keyof EventMap>(name: K, listener: Listener<K>) {
        this.emitter.on(name, (...args: EventMap[K]) => {
            try {
                const result = listener(...args);
                if (result instanceof Promise) {
                    result.catch((error: unknown) => console.error(`Error en un listener de ${name}:`, error));
                }
            } catch (error) {
                console.error(`Error en un listener de ${name}:`, error);
            }
        });
    }

    emit<K extends keyof EventMap>(name: K, ...args: EventMap[K]) {
        this.emitter.emit(name, ...args);
    }
}