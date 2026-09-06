import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StatusPage = ({ jobId, onJobComplete, onJobFailed }) => {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) return;

    const pollStatus = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/status/${jobId}`);
        setStatus(res.data);
        if (res.data.status === 'completed') {
          onJobComplete(res.data);
          clearInterval(intervalId);
        }
        if (res.data.status === 'failed') {
          onJobFailed(res.data);
          clearInterval(intervalId);
        }
      } catch (err) {
        setError('Failed to fetch job status.');
        clearInterval(intervalId);
      }
    };

    const intervalId = setInterval(pollStatus, 3000);
    pollStatus(); // Initial fetch

    return () => clearInterval(intervalId);
  }, [jobId, onJobComplete, onJobFailed]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Job Status</h2>
      <p><strong>Job ID:</strong> {jobId}</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {status ? (
        <div>
          <p><strong>Status:</strong> {status.status}</p>
          <p>This page will automatically refresh.</p>
        </div>
      ) : (
        <p>Loading status...</p>
      )}
    </div>
  );
};

export default StatusPage;
