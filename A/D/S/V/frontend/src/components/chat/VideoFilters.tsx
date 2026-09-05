'use client';

interface VideoFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onClose: () => void;
}

const filters = [
  { id: 'none', name: 'Normal', icon: '🎥' },
  { id: 'beauty', name: 'Beauty', icon: '✨' },
  { id: 'blur', name: 'Blur', icon: '🌫️' },
  { id: 'warm', name: 'Warm', icon: '🌅' },
  { id: 'cool', name: 'Cool', icon: '❄️' },
  { id: 'grayscale', name: 'B&W', icon: '🎞️' },
  { id: 'sepia', name: 'Sepia', icon: '📜' },
  { id: 'vintage', name: 'Vintage', icon: '📷' },
  { id: 'dramatic', name: 'Dramatic', icon: '🎭' },
  { id: 'neon', name: 'Neon', icon: '💜' },
];

export default function VideoFilters({ activeFilter, onFilterChange, onClose }: VideoFiltersProps) {
  return (
    <div className="absolute top-16 right-4 z-20">
      <div className="bg-gray-800/95 backdrop-blur-sm rounded-xl p-3 shadow-xl border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium text-sm">Filters</h3>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
                activeFilter === filter.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-700/50 text-white/80 hover:bg-gray-700'
              }`}
            >
              <span className="text-lg">{filter.icon}</span>
              <span className="text-[10px]">{filter.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
