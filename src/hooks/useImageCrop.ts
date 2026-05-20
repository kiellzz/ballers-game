import { useState, useRef, useCallback, useEffect } from "react";

export interface CropState {
  x: number; // in natural image pixels
  y: number;
  size: number;
}

export interface NaturalSize {
  w: number;
  h: number;
}

/**
 * Converts natural-pixel crop to percentage values suitable for CSS positioning.
 * Each axis is scaled independently so the crop box is correct on non-square images.
 */
export function cropToPercent(crop: CropState, natural: NaturalSize) {
  return {
    xPct: (crop.x / natural.w) * 100,
    yPct: (crop.y / natural.h) * 100,
    // width and height percentages are independent of each other
    wPct: (crop.size / natural.w) * 100,
    hPct: (crop.size / natural.h) * 100,
  };
}

export function useImageCrop() {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [naturalSize, setNaturalSize] = useState<NaturalSize>({ w: 1, h: 1 });
  const [crop, setCrop] = useState<CropState>({ x: 0, y: 0, size: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });

  /** Call this from the img onLoad handler */
  function handleImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    const { naturalWidth: w, naturalHeight: h } = img;
    setNaturalSize({ w, h });
    const size = Math.min(w, h);
    setCrop({ x: (w - size) / 2, y: (h - size) / 2, size });
  }

  /** Resize the crop square (value 20–100 as a percentage of the shorter edge) */
  function handleSizeChange(pct: number) {
    const minEdge = Math.min(naturalSize.w, naturalSize.h);
    const size = Math.round(minEdge * (pct / 100));
    const x = Math.min(crop.x, naturalSize.w - size);
    const y = Math.min(crop.y, naturalSize.h - size);
    setCrop({ x, y, size });
  }

  /** Current size slider value (20–100) */
  const sizeSliderValue = Math.round(
    (crop.size / Math.min(naturalSize.w, naturalSize.h)) * 100
  );

  function handleCropMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: crop.x, oy: crop.y };
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      // Scale mouse delta from CSS pixels → natural image pixels per axis
      const scaleX = naturalSize.w / rect.width;
      const scaleY = naturalSize.h / rect.height;

      const dx = (e.clientX - dragStart.current.mx) * scaleX;
      const dy = (e.clientY - dragStart.current.my) * scaleY;

      const newX = Math.max(0, Math.min(naturalSize.w - crop.size, dragStart.current.ox + dx));
      const newY = Math.max(0, Math.min(naturalSize.h - crop.size, dragStart.current.oy + dy));

      setCrop((prev) => ({ ...prev, x: newX, y: newY }));
    },
    [isDragging, naturalSize, crop.size]
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  /** Renders the cropped square into a 300×300 canvas and returns a webp data-URL */
  async function applyCrop(): Promise<string> {
    const img = imgRef.current;
    if (!img) throw new Error("Image not loaded");

    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const OUTPUT = 300;
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, OUTPUT, OUTPUT);
      resolve(canvas.toDataURL("image/webp", 0.9));
    });
  }

  const cssPercent = cropToPercent(crop, naturalSize);

  return {
    imgRef,
    containerRef,
    crop,
    isDragging,
    sizeSliderValue,
    cssPercent,
    handleImageLoad,
    handleSizeChange,
    handleCropMouseDown,
    applyCrop,
  };
}