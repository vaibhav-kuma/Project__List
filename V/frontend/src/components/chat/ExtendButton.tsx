'use client';

interface ExtendButtonProps {
  onClick: () => void;
  isExtended: boolean;
}

export default function ExtendButton({ onClick, isExtended }: ExtendButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isExtended}
      className={`px-6 py-3 rounded-lg transition font-medium ${
        isExtended
          ? 'bg-green-600 text-white cursor-not-allowed'
          : 'bg-primary-600 hover:bg-primary-700 text-white'
      }`}
    >
      {isExtended ? 'Extended!' : 'Extend (+15s)'}
    </button>
  );
}
