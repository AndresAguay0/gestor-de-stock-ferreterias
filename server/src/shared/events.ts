import { EventEmitter } from "node:events";
import { logger } from "./logger.js";

export interface StockChangedEvent {
    productId: number;
    storeId: number;
    previousQuantity: number;
    quantity: number;
    minQuantity: number;
    movementId: number;
    userId: number;
}

// Eventos disponibles y argumentos que recibe cada uno
interface EventMap {
    "stock.changed": [event: StockChangedEvent];
}

// Tipo de funcion que puede escuchar un evento
type Listener<K extends keyof EventMap> = (...args: EventMap[K]) => void | Promise<void>;

export class EventBus {
    private readonly emitter = new EventEmitter();

    // Registra un listener para un evento y captura sus posibles errores
    on<K extends keyof EventMap>(name: K, listener: Listener<K>) {
        this.emitter.on(name, (...args: EventMap[K]) => {
            try {
                // Ejecuta el listener y se fija si devuelve una Promise
                const result = listener(...args);
                if (result instanceof Promise) {

                    // Registra errores de listeners asincronos
                    result.catch((error: unknown) => logger.error(`Error en un listener de ${name}`, { err: error }));
                }
            } catch (error) {

                // Registra los errores de listeners sincronos
                logger.error(`Error en un listener de ${name}`, { err: error });
            }
        });
    }

    // Emite un evento y pasa los argumentos a los listeners registrados
    emit<K extends keyof EventMap>(name: K, ...args: EventMap[K]) {
        this.emitter.emit(name, ...args);
    }
}