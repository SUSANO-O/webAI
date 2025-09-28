import type { FC } from 'react';

const AppIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M12 3a6 6 0 0 0-6 6v6a6 6 0 0 0 6 6" />
      <path d="M12 3a6 6 0 0 1 6 6v6a6 6 0 0 1-6 6" />
      <path d="M12 21a6 6 0 0 1-6-6" />
      <path d="M12 21a6 6 0 0 0 6-6" />
      <path d="M6 9a6 6 0 0 1 6-6" />
      <path d="M18 9a6 6 0 0 0-6-6" />
    </svg>
  );
};

export default AppIcon;

