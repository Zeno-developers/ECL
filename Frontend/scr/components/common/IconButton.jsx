import React from 'react';

const IconButton = ({ 
  icon: Icon, 
  onClick, 
  size = 24,
  color = "currentColor",
  bgColor = "transparent",
  className = "",
  disabled = false,
  loading = false,
  badge,
  badgeColor = "red",
  children,
  ...props 
}) => {
  // If no valid icon is provided, don't render the icon part
  const renderIcon = Icon && typeof Icon === 'function';
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative p-2 rounded-lg transition-all duration-200 
        hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      style={{ 
        backgroundColor: bgColor,
        color: color
      }}
      {...props}
    >
      {loading ? (
        <div className="animate-spin rounded-full border-2 border-current border-t-transparent" 
             style={{ width: size, height: size }} />
      ) : (
        <>
          {renderIcon && <Icon size={size} />}
          {children}
        </>
      )}
      
      {badge && (
        <span 
          className={`
            absolute -top-1 -right-1 text-xs text-white rounded-full 
            min-w-5 h-5 flex items-center justify-center px-1
            ${badgeColor === 'red' ? 'bg-red-500' : ''}
            ${badgeColor === 'green' ? 'bg-green-500' : ''}
            ${badgeColor === 'blue' ? 'bg-blue-500' : ''}
            ${badgeColor === 'purple' ? 'bg-purple-500' : ''}
          `}
        >
          {badge}
        </span>
      )}
    </button>
  );
};

export default IconButton;
