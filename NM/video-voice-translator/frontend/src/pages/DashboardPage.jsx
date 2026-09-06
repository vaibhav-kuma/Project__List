import React, { useState } from 'react';
import UploadForm from '../components/UploadForm';
import StatusPage from './StatusPage';
import ResultPage from './ResultPage';

const DashboardPage = ({ onLogout }) => {
  const [page, setPage] = useState('upload'); // upload, status, result
  const [jobId, setJobId] = useState(null);
  const [jobResult, setJobResult] = useState(null);

  const handleUpload = (newJobId) => {
    setJobId(newJobId);
    setPage('status');
  };

  const handleJobComplete = (result) => {
    setJobResult(result);
    setPage('result');
  };

  const handleJobFailed = (result) => {
    alert(`Job failed: ${result.error}`);
    setPage('upload');
  };

  const handleReset = () => {
    setPage('upload');
    setJobId(null);
    setJobResult(null);
  };

  return (
    <div>
      <header style={{ padding: '1rem', backgroundColor: '#f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
        <h1>Video Voice Translator</h1>
        <button onClick={onLogout}>Logout</button>
      </header>
      <main>
        {page === 'upload' && <UploadForm onUpload={handleUpload} />}
        {page === 'status' && <StatusPage jobId={jobId} onJobComplete={handleJobComplete} onJobFailed={handleJobFailed} />}
        {page === 'result' && <ResultPage jobResult={jobResult} onReset={handleReset} />}
      </main>
    </div>
  );
};

export default DashboardPage;
