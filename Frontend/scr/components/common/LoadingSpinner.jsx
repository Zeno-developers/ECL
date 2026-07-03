export default function LoadingSpinner({ size = 'medium', color = 'purple' }) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8', 
    large: 'w-12 h-12'
  }

  const colorClasses = {
    purple: 'border-purple-600',
    white: 'border-white',
    gray: 'border-gray-600'
  }

  return (
    <div className="flex items-center justify-center">
      <div 
        className={`animate-spin rounded-full border-2 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]}`}
      ></div>
    </div>
  )
}
