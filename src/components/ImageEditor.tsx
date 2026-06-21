import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import {
  DEFAULT_IMAGE_EDIT_SETTINGS,
  clampCorner,
  cssFilterForSettings,
  exportEditedImageFile,
  loadImageFromFile,
  type CornerKey,
  type ImageEditSettings,
  type Point,
  type QuadCorners,
} from '@/lib/imageEdit';

const CORNER_KEYS: CornerKey[] = ['tl', 'tr', 'br', 'bl'];

function cornersToDisplay(
  corners: QuadCorners,
  rect: { left: number; top: number; width: number; height: number },
): Record<CornerKey, Point> {
  return {
    tl: { x: rect.left + corners.tl.x * rect.width, y: rect.top + corners.tl.y * rect.height },
    tr: { x: rect.left + corners.tr.x * rect.width, y: rect.top + corners.tr.y * rect.height },
    br: { x: rect.left + corners.br.x * rect.width, y: rect.top + corners.br.y * rect.height },
    bl: { x: rect.left + corners.bl.x * rect.width, y: rect.top + corners.bl.y * rect.height },
  };
}

function displayToNormalized(
  point: Point,
  rect: { left: number; top: number; width: number; height: number },
): Point {
  return clampCorner({
    x: (point.x - rect.left) / rect.width,
    y: (point.y - rect.top) / rect.height,
  });
}

export function ImageEditor({
  file,
  onDone,
  onRetake,
}: {
  file: File;
  onDone: (edited: File) => void;
  onRetake: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [settings, setSettings] = useState<ImageEditSettings>(DEFAULT_IMAGE_EDIT_SETTINGS);
  const [displayRect, setDisplayRect] = useState({ left: 0, top: 0, width: 1, height: 1 });
  const [dragging, setDragging] = useState<CornerKey | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void loadImageFromFile(file)
      .then((img) => {
        if (!cancelled) setImage(img);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load photo.');
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  const updateDisplayRect = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    const cRect = container.getBoundingClientRect();
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    if (!naturalW || !naturalH) return;

    const scale = Math.min(cRect.width / naturalW, cRect.height / naturalH);
    const width = naturalW * scale;
    const height = naturalH * scale;
    const left = (cRect.width - width) / 2;
    const top = (cRect.height - height) / 2;
    setDisplayRect({ left, top, width, height });
  }, []);

  useEffect(() => {
    updateDisplayRect();
    window.addEventListener('resize', updateDisplayRect);
    return () => window.removeEventListener('resize', updateDisplayRect);
  }, [image, updateDisplayRect]);

  const displayCorners = useMemo(
    () => cornersToDisplay(settings.corners, displayRect),
    [settings.corners, displayRect],
  );

  const polygonPoints = CORNER_KEYS.map((key) => `${displayCorners[key].x},${displayCorners[key].y}`).join(' ');

  const displayRectRef = useRef(displayRect);
  displayRectRef.current = displayRect;

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const rect = displayRectRef.current;
      const next = displayToNormalized(
        { x: e.clientX - cRect.left, y: e.clientY - cRect.top },
        rect,
      );
      setSettings((prev) => ({
        ...prev,
        corners: { ...prev.corners, [dragging]: next },
      }));
    };
    const onUp = () => setDragging(null);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging]);

  const reset = () => setSettings(DEFAULT_IMAGE_EDIT_SETTINGS);

  const apply = async () => {
    if (!image) return;
    setExporting(true);
    setError('');
    try {
      const edited = await exportEditedImageFile(image, settings, file.name);
      onDone(edited);
    } catch {
      setError('Could not save edited photo.');
    } finally {
      setExporting(false);
    }
  };

  const filter = cssFilterForSettings(settings);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Drag the corners to crop. Use the sliders or HDR to brighten the scan.
      </p>

      <div
        ref={containerRef}
        className="relative mx-auto aspect-[3/4] w-full max-h-[52vh] overflow-hidden rounded-2xl bg-text/90"
      >
        {image ? (
          <>
            <img
              ref={imgRef}
              src={image.src}
              alt="Photo preview"
              className="absolute inset-0 h-full w-full object-contain"
              style={{ filter }}
              onLoad={updateDisplayRect}
            />
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              <defs>
                <mask id="crop-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <polygon points={polygonPoints} fill="black" />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.45)" mask="url(#crop-mask)" />
              <polygon
                points={polygonPoints}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {CORNER_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                aria-label={`Adjust ${key} corner`}
                className="absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-surface-elevated shadow-md touch-none"
                style={{ left: displayCorners[key].x, top: displayCorners[key].y }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDragging(key);
                }}
              />
            ))}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">Loading photo…</div>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-surface-elevated p-4">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-text">HDR enhance</span>
          <input
            type="checkbox"
            checked={settings.hdr}
            onChange={(e) => setSettings((s) => ({ ...s, hdr: e.target.checked }))}
            className="h-5 w-5 accent-[var(--accent)]"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">Brightness</span>
          <input
            type="range"
            min={0.7}
            max={1.4}
            step={0.01}
            value={settings.brightness}
            onChange={(e) => setSettings((s) => ({ ...s, brightness: Number(e.target.value) }))}
            className="w-full accent-[var(--accent)]"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">Contrast</span>
          <input
            type="range"
            min={0.8}
            max={1.5}
            step={0.01}
            value={settings.contrast}
            onChange={(e) => setSettings((s) => ({ ...s, contrast: Number(e.target.value) }))}
            className="w-full accent-[var(--accent)]"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">Color</span>
          <input
            type="range"
            min={0.6}
            max={1.5}
            step={0.01}
            value={settings.saturation}
            onChange={(e) => setSettings((s) => ({ ...s, saturation: Number(e.target.value) }))}
            className="w-full accent-[var(--accent)]"
          />
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button className="w-full" disabled={!image || exporting} onClick={() => void apply()}>
        {exporting ? 'Applying…' : 'Use photo'}
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" className="w-full" onClick={reset}>
          Reset
        </Button>
        <Button variant="ghost" className="w-full" onClick={onRetake}>
          Retake
        </Button>
      </div>
    </div>
  );
}
