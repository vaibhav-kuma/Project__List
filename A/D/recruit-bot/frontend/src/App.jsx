import React, { useState, useEffect } from 'react';
import { jobsAPI } from './api';
import SearchForm from './SearchForm';
import StatusCard from './StatusCard';
import CandidateCard from './CandidateCard';
import ROICalculator from './ROICalculator';
import MetricsDashboard from './MetricsDashboard';
import DemoMode from './DemoMode';
import LiveSessionViewer from './LiveSessionViewer';
import { Download } from 'lucide-react';

export default function App() {
  const [jobId, setJobId] = useState(null);
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState(null);
  const [viewerUrl, setViewerUrl] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  // Poll for job status
  useEffect(() => {
    if (!jobId || !polling) return;

    const interval = setInterval(async () => {
      try {
        const jobData = await jobsAPI.getStatus(jobId);
        setJob(jobData);

        if (jobData.status === 'completed') {
          const resultsData = await jobsAPI.getResults(jobId);
          setCandidates(resultsData.candidates || []);
          setPolling(false);
        } else if (jobData.status === 'failed') {
          setPolling(false);
          setError(jobData.error || 'Job failed');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, polling]);

  const handleSearch = async (formData) => {
    setLoading(true);
    setError(null);
    setCandidates([]);
    setShowViewer(false);

    try {
      const response = await jobsAPI.create(formData);
      setJobId(response.jobId);
      setJob({ ...response, progress: 0 });
      setPolling(true);
      
      // Show viewer if available
      if (response.viewerUrl) {
        setViewerUrl(response.viewerUrl);
        setShowViewer(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create job');
      setLoading(false);
    }
  };

  const handleDemoSelect = (demo) => {
    handleSearch({
      title: demo.title,
      location: demo.location,
      skills: demo.skills,
      maxCandidates: 50,
      enrichTopN: 20,
    });
  };

  const handleExportCSV = () => {
    if (candidates.length === 0) return;

    const headers = ['Rank', 'Name', 'Headline', 'Location', 'Score', 'Skills', 'Profile URL'];
    const rows = candidates.map((c, idx) => [
      idx + 1,
      c.name,
      c.headline || '',
      c.location || '',
      c.score,
      (c.skills || []).join('; '),
      c.profileUrl || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const str = String(cell || '');
            return str.includes(',') ? `"${str}"` : str;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidates-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">RecruitBot</h1>
          <p className="text-blue-100">Autonomous Recruitment Agent</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Demo Mode */}
        {!job && <DemoMode onSelectDemo={handleDemoSelect} />}

        {/* Search Form */}
        <SearchForm onSubmit={handleSearch} loading={loading || polling} />

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6 text-red-800">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Status Card */}
        {job && <StatusCard job={job} />}

        {/* Metrics Dashboard */}
        {job && job.status === 'completed' && (
          <MetricsDashboard metadata={job.metadata} candidates={candidates} />
        )}

        {/* ROI Calculator */}
        {job && job.status === 'completed' && <ROICalculator metadata={job.metadata} />}

        {/* Results Section */}
        {candidates.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">
                Results ({candidates.length} candidates)
              </h2>
              <button
                onClick={handleExportCSV}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2 transition"
              >
                <Download size={18} />
                Export CSV
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map((candidate, idx) => (
                <CandidateCard key={idx} candidate={candidate} rank={idx + 1} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!job && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              Enter search criteria above or try a demo to find candidates
            </p>
          </div>
        )}

        {/* Loading State */}
        {polling && (
          <div className="text-center py-8">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Searching for candidates...</p>
            </div>
          </div>
        )}
      </main>

      {/* Live Session Viewer */}
      <LiveSessionViewer
        viewerUrl={viewerUrl}
        isOpen={showViewer}
        onClose={() => setShowViewer(false)}
      />

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 text-center py-4 mt-12">
        <p>RecruitBot © 2026 — Powered by TinyFish API</p>
      </footer>
    </div>
  );
}
