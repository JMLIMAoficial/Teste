import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'premium' | 'verified' | 'featured';

export type BadgeProps = {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: 'border-border-subtle bg-bg-tertiary text-text-secondary',
  premium: 'border-gold/40 bg-gold/10 text-gold',
  verified: 'border-success/40 bg-success/10 text-success',
  featured: 'border-purple-light/40 bg-purple-deep/20 text-purple-light',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
