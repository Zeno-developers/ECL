export default function Card({ children, className = '', onClick, touchable = true }) {
  const baseClasses = 'bg-white rounded-xl shadow-sm border border-gray-200'
  const touchClasses = touchable ? 'card-touch active:scale-[0.98]' : ''
  
  return (
    <div 
      className={`${baseClasses} ${touchClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}