import React from 'react';

const ResultPage = ({ jobResult, onReset }) => {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Translation Result</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h3>Original Video</h3>
          <video controls src={jobResult.storage_url} style={{ width: '100%' }} />
        </div>
        <div>
          <h3>Translated Video</h3>
          <video controls src={jobResult.final_video_url} style={{ width: '100%' }} />
        </div>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <a href={jobResult.final_video_url} download style={{ marginRight: '1rem' }}>Download Translated Video</a>
        <a href={jobResult.transcript_url} target="_blank" rel="noopener noreferrer" style={{ marginRight: '1rem' }}>View Transcript</a>
        <a href={jobResult.translated_transcript_url} target="_blank" rel="noopener noreferrer">View Translated Transcript</a>
      </div>
      <button onClick={onReset} style={{ marginTop: '2rem' }}>Upload Another Video</button>
    </div>
  );
};

export default ResultPage;
