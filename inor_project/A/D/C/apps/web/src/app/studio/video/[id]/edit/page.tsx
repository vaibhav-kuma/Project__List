'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button, Skeleton } from '@yt/ui';
import { api } from '@/lib/api';
import { Save, Eye, Trash2 } from 'lucide-react';

export default function VideoEditorPage() {
  const { id } = useParams();
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [tags, setTags] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<{ success: boolean; data: any }>(`/videos/${id}`).then((res) => {
      if (res.success) {
        setVideo(res.data);
        setTitle(res.data.title);
        setDescription(res.data.description || '');
        setCategory(res.data.category || '');
        setVisibility(res.data.status);
        setTags(res.data.tags?.join(', ') || '');
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.put(`/upload/${id}/metadata`, {
        title, description, category, tags: tags.split(',').map((t: string) => t.trim()).filter(Boolean),
      });
      await api.patch(`/upload/${id}/visibility`, { visibility });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 rounded-xl" /></div>;
  if (!video) return <div className="p-6 text-center text-gray-400">Video not found</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Video details</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Eye size={16} />}>Preview</Button>
          <Button variant="primary" size="sm" icon={<Save size={16} />} loading={saving} onClick={handleSave}>
            {saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-yt-surface rounded-xl p-4">
            <div className="aspect-video rounded-lg bg-black overflow-hidden mb-4">
              {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="w-full h-full object-contain" />}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="w-full bg-yt-bg border border-yt-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-xs text-gray-500 mt-1">{title.length}/100</span>
            </div>
          </div>

          <div className="bg-yt-surface rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              rows={8} maxLength={5000}
              className="w-full bg-yt-bg border border-yt-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="bg-yt-surface rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
            <input
              type="text" value={tags} onChange={(e) => setTags(e.target.value)}
              placeholder="Enter tags separated by commas"
              className="w-full bg-yt-bg border border-yt-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Comma separated tags help users find your video</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-yt-surface rounded-xl p-4">
            <h3 className="text-sm font-medium text-white mb-3">Visibility</h3>
            <div className="space-y-2">
              {[
                { value: 'PUBLIC', label: 'Public' },
                { value: 'UNLISTED', label: 'Unlisted' },
                { value: 'PRIVATE', label: 'Private' },
              ].map((opt) => (
                <label key={opt.value} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${visibility === opt.value ? 'bg-blue-500/10 text-blue-400' : 'text-gray-300 hover:bg-yt-hover'}`}>
                  <input type="radio" name="visibility" value={opt.value} checked={visibility === opt.value} onChange={() => setVisibility(opt.value)} className="accent-blue-500" />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-yt-surface rounded-xl p-4">
            <h3 className="text-sm font-medium text-white mb-3">Category</h3>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-yt-bg border border-yt-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="">Select category</option>
              <option value="Music">Music</option>
              <option value="Gaming">Gaming</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Education">Education</option>
              <option value="Science & Technology">Science & Technology</option>
              <option value="Sports">Sports</option>
              <option value="News">News</option>
              <option value="Comedy">Comedy</option>
            </select>
          </div>

          <div className="bg-yt-surface rounded-xl p-4">
            <h3 className="text-sm font-medium text-white mb-2">Uploaded</h3>
            <p className="text-xs text-gray-400">{video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'N/A'}</p>
            {video.publishedAt && (
              <>
                <h3 className="text-sm font-medium text-white mt-3 mb-1">Published</h3>
                <p className="text-xs text-gray-400">{new Date(video.publishedAt).toLocaleDateString()}</p>
              </>
            )}
            <h3 className="text-sm font-medium text-white mt-3 mb-1">Status</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${video.status === 'PUBLISHED' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{video.status}</span>
          </div>

          <div className="bg-yt-surface rounded-xl p-4">
            <button className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 w-full">
              <Trash2 size={16} />
              Delete video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
