declare global {
  function broadcastWebSocketMessage(type: string, data: any, targetUserId?: number | null): void;
}

export {};