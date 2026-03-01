// Server-Sent Events manager for real-time push to Pi devices
// Each device connects to /api/devices/[id]/stream and receives JSON events

type SSEClient = {
  deviceId: string;
  controller: ReadableStreamDefaultController;
};

const clients = new Map<string, SSEClient>();

export function addClient(deviceId: string, controller: ReadableStreamDefaultController) {
  clients.set(deviceId, { deviceId, controller });
}

export function removeClient(deviceId: string) {
  clients.delete(deviceId);
}

export function pushToDevice(deviceId: string, event: object) {
  const client = clients.get(deviceId);
  if (client) {
    try {
      const data = `data: ${JSON.stringify(event)}\n\n`;
      client.controller.enqueue(new TextEncoder().encode(data));
    } catch {
      clients.delete(deviceId);
    }
  }
}

export function pushToAll(event: object) {
  for (const [deviceId] of clients) {
    pushToDevice(deviceId, event);
  }
}

export function getConnectedDeviceIds(): string[] {
  return Array.from(clients.keys());
}

export function isConnected(deviceId: string): boolean {
  return clients.has(deviceId);
}
