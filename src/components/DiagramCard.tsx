import { useEffect, useState } from 'react';

interface DiagramCardProps {
  title: string;
  svgMarkup: string;
  selected: boolean;
  disabled: boolean;
  sizeLabel: string;
  onToggle: () => void;
  onDownload: () => void;
}

export function DiagramCard({
  title,
  svgMarkup,
  selected,
  disabled,
  sizeLabel,
  onToggle,
  onDownload,
}: DiagramCardProps) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (typeof URL.createObjectURL !== 'function') {
      setPreviewUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`);
      return undefined;
    }

    const svgBlob = new Blob([svgMarkup], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const nextPreviewUrl = URL.createObjectURL(svgBlob);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [svgMarkup]);

  return (
    <article className="diagram-card">
      <div className="diagram-card__header">
        <label className="diagram-card__title">
          <input
            aria-label={`${title} 选择框`}
            checked={selected}
            className="diagram-card__checkbox"
            onChange={onToggle}
            type="checkbox"
          />
          <span>{title}</span>
        </label>
        <button
          aria-label={`下载 ${title} PNG`}
          className="button button--primary"
          disabled={disabled}
          onClick={onDownload}
          type="button"
        >
          下载 PNG
        </button>
      </div>

      <div className="diagram-card__preview">
        {previewUrl ? (
          <img
            alt={`${title} 预览图`}
            className="diagram-card__image"
            decoding="async"
            loading="lazy"
            src={previewUrl}
          />
        ) : null}
      </div>

      <div className="diagram-card__meta">{sizeLabel}</div>
    </article>
  );
}
