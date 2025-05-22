import React from 'react';

interface LoadingProps {
  isShowing?: boolean; // Optional boolean prop
}

export function Loading({ isShowing = false }: LoadingProps) {
  if (!isShowing) return null;
  return (
      <div className="loading-page">
        <section className="loader">
          <div className="slider" style={{ '--i': 0 } as React.CSSProperties} />
          <div className="slider" style={{ '--i': 1 } as React.CSSProperties} />
          <div className="slider" style={{ '--i': 2 } as React.CSSProperties} />
          <div className="slider" style={{ '--i': 3 } as React.CSSProperties} />
          <div className="slider" style={{ '--i': 4 } as React.CSSProperties} />
        </section>
      </div>
  );
}
