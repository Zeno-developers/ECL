// pages/PlaceholderPage.jsx
import { useNavigate } from 'react-router-dom'
import { Heart, Construction } from 'lucide-react'

// Consistent church information
const CHURCH_INFO = {
  name: 'Eternal Love Church',
  tagline: 'We love God and love people',
}

const PlaceholderPage = ({ title = "Page" }) => {
  const navigate = useNavigate()
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Church Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Heart size={32} className="text-purple-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{CHURCH_INFO.name}</h1>
          <p className="text-purple-600 font-medium">{CHURCH_INFO.tagline}</p>
        </div>

        {/* Construction Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
              <Construction size={40} className="text-amber-600" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-3">{title}</h2>
          <p className="text-gray-500 mb-2">This page is currently under construction.</p>
          <p className="text-gray-400 text-sm mb-8">We are working hard to bring you something meaningful.</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => navigate('/')}
              className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          {CHURCH_INFO.name} | {CHURCH_INFO.tagline}
        </div>
      </div>
    </div>
  )
}

export default PlaceholderPage