import React, { useEffect, useState } from 'react';

interface IskconLogoProps {
  className?: string;
  variant?: 'white' | 'dark';
}

const processedCache: Record<'white' | 'dark', string | null> = {
  white: null,
  dark: null,
};

/**
 * Renders the exact user-provided ISKCON Lotus-Tilak emblem (/iskcon-logo.webp)
 * by converting the dark strokes into a true transparent PNG via HTML5 Canvas,
 * completely eliminating the checkerboard background and any SVG filter border.
 */
export const IskconLogo: React.FC<IskconLogoProps> = ({
  className = 'w-11 h-11',
  variant = 'white',
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(processedCache[variant]);

  useEffect(() => {
    if (processedCache[variant]) {
      setDataUrl(processedCache[variant]);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imageData.data;

        for (let i = 0; i < d.length; i += 4) {
          const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
          // Checkerboard background is light grey/white (lum > 195)
          if (lum >= 195 || d[i + 3] === 0) {
            d[i + 3] = 0;
          } else {
            // Smooth anti-aliased alpha ramp for dark strokes
            const alpha = Math.min(255, Math.max(0, Math.round(((195 - lum) / 140) * 255)));
            if (variant === 'white') {
              d[i] = 255;
              d[i + 1] = 255;
              d[i + 2] = 255;
            } else {
              d[i] = 20;
              d[i + 1] = 20;
              d[i + 2] = 20;
            }
            d[i + 3] = alpha;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const url = canvas.toDataURL('image/png');
        processedCache[variant] = url;
        setDataUrl(url);
      } catch (err) {
        console.error('Failed to process ISKCON logo on canvas:', err);
      }
    };
    img.src = '/iskcon-logo.webp';
  }, [variant]);

  if (!dataUrl) {
    return <div className={className} />;
  }

  return (
    <img
      src={dataUrl}
      alt="ISKCON Logo"
      className={`object-contain select-none block ${className}`}
    />
  );
};

export default IskconLogo;
