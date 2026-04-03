import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-accent text-accent-foreground hover:bg-accent/90': variant === 'primary',
            'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'secondary',
            'border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground': variant === 'outline',
            'text-foreground hover:bg-secondary': variant === 'ghost',
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-5 py-2.5': size === 'md',
            'px-6 py-3': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
