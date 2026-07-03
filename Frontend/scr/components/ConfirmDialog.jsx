import React from 'react'
import { AlertTriangle, CheckCircle, X } from 'lucide-react'

export default function ConfirmDialog({ 
  isOpen, 
  title = 'Confirm Action', 
  message = 'Are you sure?',
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className={`flex justify-center mb-4 ${isDangerous ? 'text-red-600' : 'text-blue-600'}`}>
          {isDangerous ? (
            <AlertTriangle size={48} className="text-red-600" />
          ) : (
            <CheckCircle size={48} className="text-blue-600" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-gray-900 text-Center mb-2">{title}</h2>

        {/* Message */}
        <p className="text-gray-600 text-center mb-6">{message}</p>

        {/* Danger warning */}
        {isDangerous && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium">⚠️ This action cannot be undone</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-white transition-colors ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
