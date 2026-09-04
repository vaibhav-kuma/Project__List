'use client';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@yt/shared';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-red-600 text-white hover:bg-red-700',
        secondary: 'bg-[#272727] text-white hover:bg-[#3a3a3a]',
        ghost: 'text-gray-300 hover:bg-[#272727]',
        outline: 'border border-gray-600 text-gray-300 hover:bg-[#272727]',
        icon: 'text-gray-300 hover:bg-[#272727] rounded-full',
      },
      size: {
        sm: 'h-8 px-3 text-xs gap-1.5',
        md: 'h-9 px-4 text-sm gap-2',
        lg: 'h-10 px-5 text-sm gap-2',
        xl: 'h-12 px-6 text-base gap-2.5',
        icon: 'h-10 w-10 p-0',
        iconSm: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, icon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon || null}
        {children && <span>{children}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
export { buttonVariants };
