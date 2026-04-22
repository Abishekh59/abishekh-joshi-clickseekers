import { io, Socket } from 'socket.io-client';
import { API_HOST } from './api';

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, ((...args: any[]) => void)[]> = new Map();

    private currentToken: string | null = null;

    connect(token?: string) {
        // If already connected with the same token, do nothing
        if (this.socket?.connected && token === this.currentToken) return;

        // If a new token is provided or we were connected as a guest, reconnect
        if (this.socket) {
            this.socket.disconnect();
        }

        this.currentToken = token || null;
        this.socket = io(API_HOST, {
            transports: ['websocket'],
            autoConnect: true,
            forceNew: true,
            reconnectionAttempts: 5,
            timeout: 10000,
            auth: token ? { token } : undefined
        });

        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket?.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            // Silently handle connection errors - WebSocket is optional
            // Uncomment below to debug socket issues:
            // console.error('Socket connection error:', error);
        });

        // Re-register all existing listeners on reconnect
        this.listeners.forEach((callbacks, event) => {
            callbacks.forEach((callback) => {
                this.socket?.on(event, callback);
            });
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    on(event: string, callback: (...args: any[]) => void) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(callback);

        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event: string, callback?: (...args: any[]) => void) {
        if (!callback) {
            this.listeners.delete(event);
            this.socket?.off(event);
        } else {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index !== -1) {
                    callbacks.splice(index, 1);
                }
            }
            this.socket?.off(event, callback);
        }
    }

    emit(event: string, ...args: any[]) {
        if (this.socket) {
            this.socket.emit(event, ...args);
        } else {
            console.warn('Attempted to emit event without socket connection:', event);
        }
    }

    getSocketId(): string | undefined {
        return this.socket?.id;
    }
}

export const socketService = new SocketService();
export default socketService;
