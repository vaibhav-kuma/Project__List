import React from 'react';
import { Play, Zap } from 'lucide-react';

export default function DemoMode({ onSelectDemo }) {
  const demoSearches = [
    {
      id: 'demo-1',
      title: 'Senior Software Engineer',
      location: 'San Francisco Bay Area',
      skills: ['JavaScript', 'Node.js', 'React', 'TypeScript'],
      description: 'Full-stack engineer with modern web tech stack',
      icon: '💻',
    },
    {
      id: 'demo-2',
      title: 'Product Manager',
      location: 'New York',
      skills: ['Product Strategy', 'Data Analysis', 'User Research'],
      description: 'Experienced product leader',
      icon: '📊',
    },
    {
      id: 'demo-3',
      title: 'DevOps Engineer',
      location: 'Remote',
      skills: ['Kubernetes', 'AWS', 'Terraform', 'Docker'],
      description: 'Cloud infrastructure specialist',
      icon: '☁️',
    },
  ];

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-md p-6 mb-6 border-2 border-purple-200">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="text-purple-600" size={24} />
        <h2 className="text-2xl font-bold text-gray-800">Demo Mode</h2>
      </div>

      <p className="text-gray-700 mb-4">
        Try one of our pre-configured searches to see RecruitBot in action:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {demoSearches.map((demo) => (
          <button
            key={demo.id}
            onClick={() => onSelectDemo(demo)}
            className="bg-white rounded-lg p-4 hover:shadow-lg transition text-left border-2 border-transparent hover:border-purple-400"
          >
            <div className="text-3xl mb-2">{demo.icon}</div>
            <h3 className="font-bold text-gray-800 mb-1">{demo.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{demo.description}</p>
            <p className="text-xs text-gray-500 mb-3">{demo.location}</p>
            <div className="flex flex-wrap gap-1 mb-3">
              {demo.skills.slice(0, 2).map((skill, idx) => (
                <span key={idx} className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                  {skill}
                </span>
              ))}
              {demo.skills.length > 2 && (
                <span className="text-xs text-gray-600 px-2 py-1">
                  +{demo.skills.length - 2} more
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-purple-600 font-bold text-sm">
              <Play size={16} />
              Run Demo
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 p-3 bg-purple-100 border border-purple-300 rounded text-purple-800 text-sm">
        <p className="font-bold mb-1">💡 Tip:</p>
        <p>Click any demo to start a pre-configured search and watch RecruitBot find candidates in real-time!</p>
      </div>
    </div>
  );
}
