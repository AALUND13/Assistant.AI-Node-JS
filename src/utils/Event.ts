interface EventObject {
    once: boolean;
    listener: (...args: any[]) => void;
}

export class EventEmitter {
    private events: Map<string, Set<EventObject>> = new Map();

    public on(event: string, listener: (...args: any[]) => void): void {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }

        this.events.get(event)?.add({ once: false, listener });
    }

    public once(event: string, listener: (...args: any[]) => void): void {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }

        this.events.get(event)?.add({ once: true, listener });
    }

    public emit(event: string, ...args: any[]): void {
        const listeners = this.events.get(event);
        if (!listeners) return;

        // Copy listeners to avoid issues if listeners are modified during emission
        for (const eventObject of Array.from(listeners)) {
            eventObject.listener(...args);

            // If the listener was registered with `once`, remove it after invocation
            if (eventObject.once) {
                listeners.delete(eventObject);
            }
        }

        // Clean up empty sets
        if (listeners.size === 0) {
            this.events.delete(event);
        }
    }

    public off(event: string, listener: (...args: any[]) => void): void {
        const listeners = this.events.get(event);
        if (!listeners) return;

        for (const eventObject of listeners) {
            if (eventObject.listener === listener) {
                listeners.delete(eventObject);
                break;
            }
        }

        // Clean up empty sets
        if (listeners.size === 0) {
            this.events.delete(event);
        }
    }

    public removeAllListeners(event?: string): void {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }
}
