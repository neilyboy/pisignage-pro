import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { addClient, removeClient } from '@/lib/sse';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const device = db.prepare('SELECT id FROM devices WHERE id = ?').get(params.id);
  if (!device) return new Response('Device not found', { status: 404 });

  const stream = new ReadableStream({
    start(controller) {
      addClient(params.id, controller);
      // Send initial ping
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'connected', deviceId: params.id })}\n\n`));
    },
    cancel() {
      removeClient(params.id);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
