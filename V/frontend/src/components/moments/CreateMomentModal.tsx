'use client';

import { useState, useRef, useCallback } from 'react';
import { useMomentsStore } from '@/store/momentsStore';

const FILTERS = [
  { id: 'none', name: 'Normal', emoji: '🎥' },
  { id: 'beauty', name: 'Beauty', emoji: '✨' },
  { id: 'warm', name: 'Warm', emoji: '🌅' },
  { id: 'cool', name: 'Cool', emoji: '❄️' },
  { id: 'vintage', name: 'Vintage', emoji: '📷' },
  { id: 'dramatic', name: 'Drama', emoji: '🎭' },
];

const STICKERS = [
  { id: 'heart', emoji: '❤️', name: 'Heart' },
  { id: 'fire', emoji: '🔥', name: 'Fire' },
  { id: 'star', emoji: '⭐', name: 'Star' },
  { id: 'smile', emoji: '😊', name: 'Smile' },
  { id: 'cool', emoji: '😎', name: 'Cool' },
  { id: 'love', emoji: '😍', name: 'Love' },
  { id: 'party', emoji: '🎉', name: 'Party' },
  { id: 'music', emoji: '🎵', name: 'Music' },
  { id: 'sun', emoji: '☀️', name: 'Sun' },
  { id: 'moon', emoji: '🌙', name: 'Moon' },
  { id: 'rainbow', emoji: '🌈', name: 'Rainbow' },
  { id: 'thumbsup', emoji: '👍', name: 'Thumbs Up' },
];

interface CreateMomentModalProps {
  onClose: () => void;
}

export default function CreateMomentModal({ onClose }: CreateMomentModalProps) {
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'select' | 'edit' | 'upload'>('select');
  const [activeFilter, setActiveFilter] = useState('none');
  const [selectedStickers, setSelectedStickers] = useState<Array<{ id: string; emoji: string; x: number; y: number }>>([]);
  const [visibility, setVisibility] = useState<'friends' | 'public'>('friends');
  const [draggingSticker, setDraggingSticker] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const { createMoment, getUploadUrl } = useMomentsStore();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Use JPEG, PNG, WebP, GIF, MP4, or WebM.');
      return;
    }

    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File too large. Maximum ${file.type.startsWith('video/') ? '50MB' : '10MB'}.`);
      return;
    }

    setSelectedFile(file);
    setError('');

    if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    setStep('edit');
  }, []);

  const handleAddSticker = useCallback((sticker: typeof STICKERS[0]) => {
    setSelectedStickers((prev) => [
      ...prev,
      { id: sticker.id, emoji: sticker.emoji, x: 50, y: 50 },
    ]);
  }, []);

  const handleRemoveSticker = useCallback((index: number) => {
    setSelectedStickers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const getFilterStyle = (): string => {
    const filterMap: Record<string, string> = {
      none: '',
      beauty: 'blur(1px) saturate(1.2) brightness(1.15) contrast(1.05)',
      warm: 'saturate(1.5) brightness(1.1)',
      cool: 'saturate(0.8) hue-rotate(180deg)',
      vintage: 'sepia(50%) contrast(1.1) brightness(0.9)',
      dramatic: 'contrast(1.5) brightness(0.8) saturate(0.7)',
    };
    return filterMap[activeFilter] || '';
  };

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setStep('upload');

    try {
      const isVideo = selectedFile.type.startsWith('video/');
      const { uploadUrl, publicUrl, key, thumbnailUrl } = await getUploadUrl(
        selectedFile.name,
        selectedFile.type,
        isVideo
      );

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: { 'Content-Type': selectedFile.type },
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      await createMoment({
        mediaUrl: publicUrl,
        mediaPublicId: key,
        mediaType: isVideo ? 'video' : selectedFile.type === 'image/gif' ? 'gif' : 'image',
        caption: caption || undefined,
        fileSize: selectedFile.size,
        visibility,
        filters: activeFilter !== 'none' ? [activeFilter] : [],
        stickers: selectedStickers.map((s) => ({
          type: s.id,
          emoji: s.emoji,
          x: s.x,
          y: s.y,
        })),
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setStep('edit');
    } finally {
      setUploading(false);
    }
  }, [selectedFile, caption, visibility, activeFilter, selectedStickers, createMoment, getUploadUrl, onClose]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-gray-800 w-full sm:max-w-lg sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
          <h2 className="text-lg font-semibold text-white">
            {step === 'select' ? 'New Moment' : step === 'edit' ? 'Edit Moment' : 'Uploading...'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-900/50 text-red-300 p-3 rounded-lg text-sm">{error}</div>
          )}

          {step === 'select' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-square bg-gray-700 rounded-xl flex flex-col items-center justify-center gap-3 hover:bg-gray-600 transition border-2 border-dashed border-gray-600"
            >
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-gray-400">Tap to select photo or video</span>
              <span className="text-gray-500 text-xs">JPEG, PNG, WebP, GIF, MP4, WebM</span>
            </button>
          )}

          {step === 'edit' && preview && (
            <>
              <div ref={previewRef} className="relative rounded-xl overflow-hidden bg-gray-900">
                {selectedFile?.type.startsWith('video/') ? (
                  <video src={preview} className="w-full" style={{ filter: getFilterStyle() }} controls />
                ) : (
                  <img src={preview} alt="Preview" className="w-full" style={{ filter: getFilterStyle() }} />
                )}

                {selectedStickers.map((sticker, index) => (
                  <div
                    key={index}
                    className="absolute text-4xl cursor-move select-none"
                    style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, transform: 'translate(-50%, -50%)' }}
                    onClick={() => handleRemoveSticker(index)}
                  >
                    {sticker.emoji}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Filters</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg min-w-[60px] transition ${
                        activeFilter === filter.id
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-700/50 text-white/80 hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-lg">{filter.emoji}</span>
                      <span className="text-[10px]">{filter.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Stickers</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {STICKERS.map((sticker) => (
                    <button
                      key={sticker.id}
                      onClick={() => handleAddSticker(sticker)}
                      className="text-2xl p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition"
                    >
                      {sticker.emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Caption</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption..."
                  className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={2}
                  maxLength={300}
                />
                <p className="text-gray-500 text-xs mt-1">{caption.length}/300</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Visibility</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVisibility('friends')}
                    className={`flex-1 py-2 rounded-lg transition ${
                      visibility === 'friends'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Friends Only
                  </button>
                  <button
                    onClick={() => setVisibility('public')}
                    className={`flex-1 py-2 rounded-lg transition ${
                      visibility === 'public'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Public
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                    setStep('select');
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition"
                >
                  Back
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg transition disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Share'}
                </button>
              </div>
            </>
          )}

          {step === 'upload' && (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-white text-lg">Uploading your Moment...</p>
              <p className="text-gray-400 text-sm mt-2">This may take a moment</p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
