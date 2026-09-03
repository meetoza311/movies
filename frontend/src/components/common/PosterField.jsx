import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ImagePlus, Link2, Upload } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import { cn } from '../../utils/format';

const MAX_BYTES = 1.5 * 1024 * 1024; // ~1.5MB before compress

async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 900;
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
  return dataUrl;
}

export default function PosterField({ value, onChange }) {
  const [mode, setMode] = useState(value?.startsWith('data:') ? 'upload' : 'url');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > MAX_BYTES * 3) {
      toast.error('Image is too large (max ~4MB)');
      return;
    }

    setBusy(true);
    try {
      const dataUrl = await compressImage(file);
      onChange(dataUrl);
      toast.success('Poster ready');
    } catch {
      toast.error('Could not process image');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold',
            mode === 'url' ? 'bg-teal text-white' : 'bg-paper text-muted'
          )}
        >
          <Link2 size={14} /> Image URL
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold',
            mode === 'upload' ? 'bg-teal text-white' : 'bg-paper text-muted'
          )}
        >
          <Upload size={14} /> Upload file
        </button>
      </div>

      {mode === 'url' ? (
        <Input
          label="Poster image URL"
          value={value?.startsWith('data:') ? '' : value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/poster.jpg"
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-paper/70 p-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="outline"
            loading={busy}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus size={16} /> Choose image from device
          </Button>
          <p className="mt-2 text-xs text-muted">
            JPG/PNG from phone or computer. Image is compressed before saving.
          </p>
        </div>
      )}

      {value ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <img
            src={value}
            alt="Poster preview"
            className="mx-auto max-h-64 w-full object-contain bg-ink/5"
          />
          <div className="flex justify-end p-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange('')}>
              Remove poster
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
