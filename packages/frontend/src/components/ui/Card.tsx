import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass';
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', hover = false, className = '', ...props }, ref) => {
    const baseStyles = 'rounded-lg p-3 sm:p-4 md:p-6';

    const variants = {
      default: 'bg-white dark:bg-gray-100 dark:bg-primary-bg-secondary border border-gray-300 dark:border-gray-800',
      glass: 'glass-card',
    };

    const hoverStyles = hover ? 'hover:border-accent-primary/50 transition-all duration-200 cursor-pointer' : '';

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${hoverStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = ({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`mb-3 sm:mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`text-lg sm:text-xl font-heading font-semibold text-text-light-primary dark:text-text-primary ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '', ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-sm text-text-light-muted dark:text-text-muted mt-1 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={className} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-300 dark:border-gray-800 ${className}`} {...props}>
    {children}
  </div>
);
