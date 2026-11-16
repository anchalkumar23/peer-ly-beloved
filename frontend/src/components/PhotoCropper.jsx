import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Slider } from "@/components/ui/slider";
import { Btn } from "./scrap/Scrap";

const toBlob = async (src, area) => {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 640;
  canvas.getContext("2d").drawImage(img, area.x, area.y, area.width, area.height, 0, 0, 640, 640);
  return new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.88));
};

export const PhotoCropper = ({ src, onCancel, onDone, busy }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.2);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState(null);
  const onComplete = useCallback((_, px) => setArea(px), []);

  return (
    <div className="space-y-4" data-testid="photo-cropper">
      <div className="relative w-full max-w-[280px] mx-auto aspect-square rounded-2xl overflow-hidden brutal bg-[#1E1E24]">
        <Cropper image={src} crop={crop} zoom={zoom} rotation={rotation} aspect={1} cropShape="round" showGrid={false}
          onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onComplete} />
      </div>
      <label className="block text-sm font-semibold">Zoom
        <Slider data-testid="photo-zoom-slider" className="mt-2" min={1} max={3} step={0.05} value={[zoom]} onValueChange={(v) => setZoom(v[0])} aria-label="Zoom" />
      </label>
      <label className="block text-sm font-semibold">Tilt
        <Slider data-testid="photo-rotate-slider" className="mt-2" min={-30} max={30} step={1} value={[rotation]} onValueChange={(v) => setRotation(v[0])} aria-label="Rotate" />
      </label>
      <div className="flex gap-3">
        <Btn variant="paper" className="flex-1" onClick={onCancel} data-testid="photo-crop-cancel">Cancel</Btn>
        <Btn className="flex-1" loading={busy} data-testid="photo-crop-save"
          onClick={async () => area && onDone(await toBlobRotated(src, area, rotation))}>Use this</Btn>
      </div>
    </div>
  );
};

const toBlobRotated = async (src, area, rotation) => {
  if (!rotation) return toBlob(src, area);
  const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
  const rad = (rotation * Math.PI) / 180;
  const w = Math.abs(Math.cos(rad) * img.width) + Math.abs(Math.sin(rad) * img.height);
  const h = Math.abs(Math.sin(rad) * img.width) + Math.abs(Math.cos(rad) * img.height);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return toBlob(c.toDataURL("image/jpeg"), area);
};
