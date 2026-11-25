/** shadcn/ui Button (copied in, as shadcn intends), with a pressed state for instant feedback. */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib-utils';

export const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-[transform,background-color,opacity] duration-75 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-orange-500 text-white hover:bg-orange-400 active:bg-orange-600',
        secondary: 'bg-white/10 text-white hover:bg-white/15 active:bg-white/20',
        ghost: 'text-white/80 hover:bg-white/10 active:bg-white/15',
        destructive: 'bg-red-500/15 text-red-300 hover:bg-red-500/25',
      },
      size: {
        default: 'h-11 px-4',
        lg: 'h-14 px-6 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = 'Button';
