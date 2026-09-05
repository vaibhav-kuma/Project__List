import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function SearchForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    skills: '',
    maxCandidates: 50,
    enrichTopN: 20,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'maxCandidates' || name === 'enrichTopN' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Job title is required');
      return;
    }

    const skills = formData.skills
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s);

    onSubmit({
      title: formData.title,
      location: formData.location || undefined,
      skills,
      maxCandidates: formData.maxCandidates,
      enrichTopN: formData.enrichTopN,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Find Candidates</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., Senior Software Engineer"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g., San Francisco Bay Area"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Required Skills (comma-separated)
          </label>
          <input
            type="text"
            name="skills"
            value={formData.skills}
            onChange={handleChange}
            placeholder="e.g., JavaScript, Node.js, React, TypeScript"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Candidates
          </label>
          <input
            type="number"
            name="maxCandidates"
            value={formData.maxCandidates}
            onChange={handleChange}
            min="1"
            max="200"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Enrich Top N Profiles
          </label>
          <input
            type="number"
            name="enrichTopN"
            value={formData.enrichTopN}
            onChange={handleChange}
            min="0"
            max="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2 transition"
      >
        <Search size={20} />
        {loading ? 'Searching...' : 'Start Search'}
      </button>
    </form>
  );
}
