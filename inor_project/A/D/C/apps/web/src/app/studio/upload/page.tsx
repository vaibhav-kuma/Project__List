'use client';
import { useState, useRef, useCallback } from 'react';
import { Button } from '@yt/ui';
import { api } from '@/lib/api';
import { Upload, FileVideo, X, Check } from 'lucide-react';

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<'select' | 'details' | 'visibility' | 'processing' | 'done'>('select');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleFile = (f: File) => {
    const validTypes = ['video/mp4', 'video/webm', 'video/mkv', 'video/avi', 'video/quicktime'];
    if (!validTypes.includes(f.type)) {
      alert('Please upload a video file (mp4, webm, mkv, avi, mov)');
      return;
    }
    setFile(f);
    setTitle(f.name.replace(/\.[^/.]+$/, ''));
    setStep('details');
  };

  const startUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStep('processing');

    try {
      const res = await api.post<{ success: boolean; data: { videoId: string } }>('/upload/initiate', {
        title, description, visibility,
      });

      if (res.success) {
        for (let i = 0; i <= 100; i += 10) {
          await new Promise((r) => setTimeout(r, 200));
          setProgress(i);
        }
        await api.post('/upload/complete', { videoId: res.data.videoId, key: `videos/${res.data.videoId}/original/${file.name}` });
        setStep('done');
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Upload Video</h1>

      {step === 'select' && (
        <div
          className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${
            dragActive ? 'border-blue-500 bg-blue-500/5' : 'border-yt-border hover:border-gray-500'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-lg text-white mb-2">Drag and drop video files to upload</p>
          <p className="text-sm text-gray-400 mb-4">Your videos will be private until you publish them</p>
          <Button variant="primary" size="lg">Select files</Button>
          <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <p className="text-xs text-gray-500 mt-4">By submitting your videos you agree to our Terms of Service</p>
        </div>
      )}

      {step === 'details' && file && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-yt-surface rounded-xl">
            <FileVideo size={32} className="text-blue-400" />
            <div>
              <p className="text-sm font-medium text-white">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="w-full bg-yt-bg border border-yt-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <span className="text-xs text-gray-500 mt-1">{title.length}/100</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={5000}
              className="w-full bg-yt-bg border border-yt-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep('select')} className="px-4 py-2 text-sm text-gray-300 hover:text-white">Back</button>
            <Button variant="primary" onClick={() => setStep('visibility')}>Next</Button>
          </div>
        </div>
      )}

      {step === 'visibility' && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-white">Visibility</h2>
          {[
            { value: 'PUBLIC', label: 'Public', desc: 'Anyone can search and watch' },
            { value: 'UNLISTED', label: 'Unlisted', desc: 'Anyone with the link can watch' },
            { value: 'PRIVATE', label: 'Private', desc: 'Only you can watch' },
          ].map((opt) => (
            <label key={opt.value} className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer border transition-colors ${visibility === opt.value ? 'border-blue-500 bg-blue-500/10' : 'border-yt-border hover:bg-yt-hover'}`}>
              <input type="radio" name="visibility" value={opt.value} checked={visibility === opt.value} onChange={() => setVisibility(opt.value)} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">{opt.label}</p>
                <p className="text-xs text-gray-400">{opt.desc}</p>
              </div>
            </label>
          ))}
          <div className="flex gap-2">
            <button onClick={() => setStep('details')} className="px-4 py-2 text-sm text-gray-300 hover:text-white">Back</button>
            <Button variant="primary" onClick={startUpload} loading={uploading}>Upload</Button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="bg-yt-surface rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
            <Upload size={28} className="text-blue-400 animate-pulse" />
          </div>
          <h2 className="text-lg font-medium text-white mb-2">Uploading your video</h2>
          <div className="w-full bg-yt-bg rounded-full h-2 mb-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-gray-400">{progress}%</p>
        </div>
      )}

      {step === 'done' && (
        <div className="bg-yt-surface rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-green-400" />
          </div>
          <h2 className="text-lg font-medium text-white mb-2">Upload successful!</h2>
          <p className="text-sm text-gray-400 mb-4">Your video is being processed</p>
          <div className="flex gap-2 justify-center">
            <Button variant="primary" onClick={() => window.location.href = '/studio/content'}>Go to Videos</Button>
            <Button variant="secondary" onClick={() => window.location.href = '/'}>Back to Home</Button>
          </div>
        </div>
      )}
    </div>
  );
}
