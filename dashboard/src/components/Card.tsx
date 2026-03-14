import React from 'react';

interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export default function Card({ title, description, children, className = '', action }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h3 className="text-lg font-semibold text-discord-white">{title}</h3>}
            {description && <p className="text-sm text-discord-muted mt-0.5">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
