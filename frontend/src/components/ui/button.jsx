import React from 'react';

export const Button = React.forwardRef(
  (
    {
      children,
      type = 'button',
      variant = 'primary',
      size = 'default',
      className = '',
      disabled = false,
      ...props
    },
    ref
  ) => {
    // Base styles: Instant hover/focus, no transitions, minimum 44px touch target
    let baseStyles =
      'inline-flex items-center justify-center font-medium select-none min-h-[44px] px-6 text-sm tracking-wider uppercase disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-[#CFC9BA]';

    let variantStyles = '';
    if (variant === 'primary') {
      variantStyles =
        'bg-[#CFC9BA] text-[#0F0A09] hover:bg-[#E5E0D3] active:bg-[#B8B2A4] border border-[#CFC9BA]';
    } else if (variant === 'secondary') {
      variantStyles =
        'bg-[#181210] text-[#CFC9BA] hover:bg-[#221A18] active:bg-[#2E1814] border border-[#2E1814]';
    } else if (variant === 'outline') {
      variantStyles =
        'bg-transparent text-[#CFC9BA] border border-[#CFC9BA] hover:bg-[#CFC9BA] hover:text-[#0F0A09] active:bg-[#B8B2A4] active:text-[#0F0A09]';
    } else if (variant === 'ghost') {
      variantStyles =
        'bg-transparent text-[#CFC9BA] hover:bg-[#181210] hover:text-[#E5E0D3] active:bg-[#221A18]';
    } else if (variant === 'destructive') {
      variantStyles =
        'bg-red-950 text-red-200 border border-red-800 hover:bg-red-900 active:bg-red-800';
    }

    let sizeStyles = '';
    if (size === 'sm') {
      sizeStyles = 'min-h-[38px] px-4 text-xs';
    } else if (size === 'lg') {
      sizeStyles = 'min-h-[50px] px-8 text-base';
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`.trim()}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
