import type { ReactNode } from 'react';

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Ring, der sich mit der Restzeit leert. fraction: 1 voll, 0 leer. */
export function CountdownRing({ fraction, children }: { fraction: number; children: ReactNode }) {
  return (
    <div className="ring">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="ring__track" cx="60" cy="60" r={RADIUS} />
        <circle
          className="ring__value"
          cx="60"
          cy="60"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="ring__label">{children}</div>
    </div>
  );
}
