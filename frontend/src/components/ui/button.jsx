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
      loading = false,
      ...props
    },
    ref
  ) => {
    // Base styles: Subtle transition (150ms colour/bg/border/opacity/shadow), minimum 44px touch target
    let baseStyles =
      'inline-flex items-center justify-center font-medium select-none min-h-[44px] px-6 text-sm tracking-wider uppercase transition-subtle disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-[#FEF5E6]';

    let variantStyles = '';
    if (variant === 'primary') {
      variantStyles =
        'bg-[#FEF5E6] text-[#0F0A09] hover:bg-[#FFFFFF] active:bg-[#EADBCE] border border-[#FEF5E6]';
    } else if (variant === 'secondary') {
      variantStyles =
        'bg-[#181210] text-[#FEF5E6] hover:bg-[#241B18] active:bg-[#2F1C15] border border-[#2F1C15]';
    } else if (variant === 'outline') {
      variantStyles =
        'bg-transparent text-[#FEF5E6] border border-[#FEF5E6] hover:bg-[#FEF5E6] hover:text-[#0F0A09] active:bg-[#EADBCE] active:text-[#0F0A09]';
    } else if (variant === 'ghost') {
      variantStyles =
        'bg-transparent text-[#B8AD9A] hover:bg-[#181210] hover:text-[#FEF5E6] active:bg-[#241B18]';
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
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`.trim()}
        {...props}
      >
        {loading && (
          <span
            className="inline-block w-4 h-4 mr-2.5 border-2 border-current border-t-transparent rounded-full animate-spinner shrink-0"
            role="status"
            aria-label="Loading"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
