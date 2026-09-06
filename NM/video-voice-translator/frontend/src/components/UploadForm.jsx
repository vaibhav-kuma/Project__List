import React, { useState } from 'react';
import axios from 'axios';

const UploadForm = ({ onUpload }) => {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [voiceStyle, setVoiceStyle] = useState('default');
  const [voicePitch, setVoicePitch] = useState('1.0');
  const [voiceSpeed, setVoiceSpeed] = useState('1.0');

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    const allowed = ['mp4', 'mov', 'avi'];
    const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
    if (!allowed.includes(ext)) {
      setStatus('Invalid file type. Allowed: mp4, mov, avi.');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setStatus('File size exceeds 500MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_language', targetLanguage);
    formData.append('voice_style', voiceStyle);
    formData.append('pitch', voicePitch);
    formData.append('speed', voiceSpeed);

    try {
      setStatus('Uploading...');
      const res = await axios.post('http://localhost:8000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          }
        },
      });
      onUpload(res.data.job_id);
    } catch (err) {
      console.error(err);
      setStatus('Upload failed.');
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Upload Video</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="file-upload" style={{ display: 'block', marginBottom: '0.5rem' }}>Select Video File</label>
          <input id="file-upload" type="file" accept=".mp4,.mov,.avi,video/mp4,video/quicktime,video/x-msvideo" onChange={handleFileChange} />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label htmlFor="language-select" style={{ display: 'block', marginBottom: '0.5rem' }}>Select Target Language</label>
          <select id="language-select" value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
            <option value="en">English</option>
          </select>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label htmlFor="style-select" style={{ display: 'block', marginBottom: '0.5rem' }}>Select Voice Style</label>
          <select id="style-select" value={voiceStyle} onChange={(e) => setVoiceStyle(e.target.value)}>
            <option value="default">Default</option>
            {/* Add other voice styles as they become available */}
          </select>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label htmlFor="pitch-select" style={{ display: 'block', marginBottom: '0.5rem' }}>Select Voice Pitch</label>
          <select id="pitch-select" value={voicePitch} onChange={(e) => setVoicePitch(e.target.value)}>
            <option value="0.8">Low</option>
            <option value="1.0">Normal</option>
            <option value="1.2">High</option>
          </select>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label htmlFor="speed-select" style={{ display: 'block', marginBottom: '0.5rem' }}>Select Voice Speed</label>
          <select id="speed-select" value={voiceSpeed} onChange={(e) => setVoiceSpeed(e.target.value)}>
            <option value="0.8">Slow</option>
            <option value="1.0">Normal</option>
            <option value="1.2">Fast</option>
          </select>
        </div>
        <button type="submit" style={{ marginTop: '1rem' }}>Upload</button>
      </form>
      {status && <p>{status}</p>}
      {progress > 0 && <progress value={progress} max="100" />}
    </div>
  );
};

export default UploadForm;
