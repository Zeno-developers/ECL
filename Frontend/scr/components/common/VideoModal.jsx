// components/common/VideoModal.jsx
import React from 'react';
import { X } from 'lucide-react';

export default function VideoModal({ isOpen, onClose, video }) {
  if (!isOpen || !video) return null;

  return (
    <div id="videoModal" className="modal" style={{ display: 'block' }}>
      <div className="modal-content">
        <span className="close" onClick={onClose}>
          <X size={24} />
        </span>
        <video id="modalVideo" controls autoPlay>
          <source src={video.videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="video-info">
          <h3 id="videoTitle">{video.title}</h3>
          <p id="videoDescription">{video.description}</p>
          <p id="videoDate">Preached on {new Date(video.date).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}