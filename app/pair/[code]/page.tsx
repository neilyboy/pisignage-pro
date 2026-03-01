'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Layers } from 'lucide-react';

export default function PairPage() {
  const { code } = useParams<{ code: string }>();
  const [status, setStatus] = useState<'waiting' | 'adopted'>('waiting');
  const [deviceName, setDeviceName] = useState('');
  const [dots, setDots] = useState('');

  // Animated dots
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, []);

  // Poll for adoption
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/devices/pair?code=${code}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.adopted) {
          setDeviceName(data.name ?? 'Display');
          setStatus('adopted');
          setTimeout(() => {
            window.location.href = `/display/${data.id}`;
          }, 2000);
        }
      } catch {}
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, [code]);

  if (status === 'adopted') {
    return (
      <div className="w-screen h-screen bg-[#0a1628] flex flex-col items-center justify-center text-white">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-4xl font-bold text-green-400 mb-3">Device Adopted!</div>
        <div className="text-2xl text-white">{deviceName}</div>
        <div className="text-gray-400 mt-3">Loading display{dots}</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-[#0a1628] flex flex-col items-center justify-center text-white select-none">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-16">
        <Layers className="w-10 h-10 text-blue-400" />
        <span className="text-4xl font-bold">PiSignage<span className="text-blue-400">Pro</span></span>
      </div>

      {/* Pairing code */}
      <div className="bg-white/5 border border-white/10 rounded-3xl px-16 py-12 text-center backdrop-blur-sm">
        <div className="text-gray-400 text-xl mb-4 uppercase tracking-widest font-medium">Pairing Code</div>
        <div className="font-mono text-8xl font-bold tracking-[0.3em] text-white mb-2">
          {code?.slice(0, 3)}<span className="text-blue-400"> </span>{code?.slice(3)}
        </div>
        <div className="text-gray-500 mt-6 text-lg">Waiting for adoption{dots}</div>
      </div>

      {/* Instructions */}
      <div className="mt-12 text-center text-gray-500 max-w-lg">
        <p className="text-lg">Go to the <span className="text-blue-400 font-medium">PiSignage Pro admin</span> panel,</p>
        <p className="text-lg">find this device under <span className="text-white font-medium">Devices → Pending</span>,</p>
        <p className="text-lg">and click <span className="text-green-400 font-medium">Adopt Device</span>.</p>
      </div>

      <div className="mt-16 text-gray-700 text-sm">Device will refresh automatically when adopted</div>
    </div>
  );
}
