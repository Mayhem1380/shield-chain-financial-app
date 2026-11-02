'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { parsePublicAddressQr } from '@/lib/sf-wallet/policy.mjs';

type Detector = { detect(source: HTMLCanvasElement): Promise<{ rawValue: string }[]> };
export default function QrScanner({ selectedChain, onAddress }: { selectedChain: string; onAddress(value: { chainKey: string; address: string }): void }) {
  const video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null);
  const active = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chain = useRef(selectedChain), callback = useRef(onAddress);
  const [scanning, setScanning] = useState(false), [message, setMessage] = useState('');
  useEffect(() => { chain.current = selectedChain; callback.current = onAddress; }, [selectedChain, onAddress]);
  const stop = useCallback(() => { active.current = false; if (timer.current) clearTimeout(timer.current); stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setScanning(false); }, []);
  useEffect(() => () => { active.current = false; if (timer.current) clearTimeout(timer.current); stream.current?.getTracks().forEach(track => track.stop()); }, []);

  async function decode(canvas: HTMLCanvasElement) {
    const Native = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => Detector }).BarcodeDetector;
    if (Native) { try { return (await new Native({ formats: ['qr_code'] }).detect(canvas))[0]?.rawValue || null; } catch {} }
    const pixels = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height);
    if (!pixels) return null;
    const jsQR = (await import('jsqr')).default;
    return jsQR(pixels.data, pixels.width, pixels.height)?.data || null;
  }
  function accept(text: string) {
    stop();
    try { callback.current(parsePublicAddressQr(text, chain.current)); setMessage('Public address selected. Review the network and save it below.'); }
    catch { setMessage('Only a supported public address is accepted. Payment requests, keys and recovery phrases are rejected.'); }
  }
  async function frame() {
    if (!active.current || !video.current) return;
    try {
      if (video.current.readyState >= 2) {
        const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = Math.max(1, Math.round(640 * video.current.videoHeight / video.current.videoWidth));
        if (canvas.height <= 1920) { canvas.getContext('2d')?.drawImage(video.current, 0, 0, canvas.width, canvas.height); const value = await decode(canvas); if (value && active.current) { accept(value); return; } }
      }
    } catch { if (active.current) { stop(); setMessage('Camera scan unavailable. Paste a public address or choose a QR image.'); } }
    if (active.current) timer.current = setTimeout(() => void frame(), 500);
  }
  async function start() {
    active.current = true; setScanning(true); setMessage('Camera frames stay on this device.');
    try {
      const camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (!active.current) { camera.getTracks().forEach(track => track.stop()); return; }
      stream.current = camera;
      if (!video.current) { stop(); return; }
      video.current.srcObject = camera; await video.current.play(); void frame();
    } catch { stop(); setMessage('Camera access unavailable. Use a QR image or paste a public address.'); }
  }
  async function image(file?: File) {
    stop(); if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setMessage('Choose a PNG, JPEG or WebP image up to 5 MB.'); return; }
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 16000000) throw Error('image-size');
      const canvas = document.createElement('canvas'); const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const value = await decode(canvas); if (value) accept(value); else setMessage('No readable public-address QR found. You can paste the public address instead.');
    } catch { setMessage('Unable to scan this image. No image was uploaded.'); }
    finally { bitmap?.close(); }
  }
  return <section className="sfw-scanner"><h3>Public-address scanner</h3><p>Scan locally, then review the address. Never scan a private key or recovery phrase.</p><button type="button" disabled={scanning} onClick={() => void start()}>Scan with camera</button>{scanning && <button type="button" onClick={stop}>Stop camera</button>}<label>Choose a QR image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { void image(event.target.files?.[0]); event.target.value = ''; }} /></label><video ref={video} className={scanning ? 'sfw-camera' : 'sfw-camera sfw-hidden'} muted playsInline aria-label="Local QR scanner camera preview" />{message && <p role="status">{message}</p>}</section>;
}
