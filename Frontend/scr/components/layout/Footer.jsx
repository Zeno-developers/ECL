// components/layout/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Church, 
  MapPin, 
  Phone, 
  Mail, 
  Facebook, 
  Youtube, 
  Instagram, 
  MessageCircle 
} from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-gradient-to-br from-purple-900 to-purple-700 text-white py-12">
      <div className="container mx-auto px-4">

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">

          {/* Church Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-400/20 rounded-lg flex items-center justify-center">
                <Church size={22} className="text-purple-300" />
              </div>
              <h3 className="text-white font-bold text-lg font-['Playfair_Display']">
                Eternal Love Church
              </h3>
            </div>

            <p className="text-purple-200 text-sm leading-relaxed">
              A Spirit-filled, prophetic church raising lives transformed by the love of God.
              Encounter God. Experience Love. Walk in Purpose.
            </p>

            {/* Socials */}
            <div className="flex gap-3 pt-2">
              <a href="#" aria-label="Facebook" className="footer-icon">
                <Facebook size={18} />
              </a>
              <a href="#" aria-label="YouTube" className="footer-icon">
                <Youtube size={18} />
              </a>
              <a href="#" aria-label="Instagram" className="footer-icon">
                <Instagram size={18} />
              </a>
              <a href="https://wa.me/27727641137" aria-label="WhatsApp" className="footer-icon">
                <MessageCircle size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="footer-title">Quick Links</h3>
            <div className="footer-links">
              <button onClick={() => scrollToSection('home')}>Home</button>
              <button onClick={() => scrollToSection('about')}>About Us</button>
              <button onClick={() => scrollToSection('sermons')}>Sermons</button>
              <button onClick={() => scrollToSection('events')}>Events</button>
              <button onClick={() => scrollToSection('contact')}>Contact</button>
            </div>
          </div>

          {/* Ministries */}
          <div>
            <h3 className="footer-title">Ministries</h3>
            <div className="footer-links">
              <button onClick={() => scrollToSection('ministries')}>Prayer Ministry</button>
              <button onClick={() => scrollToSection('ministries')}>Worship Team</button>
              <button onClick={() => scrollToSection('ministries')}>Children's Ministry</button>
              <button onClick={() => scrollToSection('ministries')}>Youth Ministry</button>
              <button onClick={() => scrollToSection('ministries')}>Outreach</button>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="footer-title">Contact</h3>
            <div className="space-y-3 text-sm">

              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-purple-300 mt-0.5" />
                <span className="text-purple-200">
                  A3313 Road, Mtubatuba, South Africa
                </span>
              </div>

              <div className="flex items-start gap-3">
                <Phone size={18} className="text-purple-300 mt-0.5" />
                <a href="tel:+27727641137" className="text-purple-200 hover:text-white">
                  +27 72 764 1137
                </a>
              </div>

              <div className="flex items-start gap-3">
                <Mail size={18} className="text-purple-300 mt-0.5" />
                <a href="mailto:info@elchurch.site" className="text-purple-200 hover:text-white">
                  info@elchurch.site
                </a>
              </div>

            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-purple-600/30 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-purple-300 text-sm text-center md:text-left">
            &copy; {currentYear} Eternal Love Church. All rights reserved.
          </p>

          <p className="text-purple-400 text-xs text-center md:text-right">
            Platform & Systems by <a href='zenolaunch.co.za' target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-white">
              Zenolaunch
            </a>
          </p>
          <div className="flex gap-6 text-sm">
            <Link to="/privacy" className="text-purple-300 hover:text-white">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-purple-300 hover:text-white">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>

      {/* Reusable styles */}
      <style jsx>{`
        .footer-title {
          font-weight: bold;
          margin-bottom: 12px;
        }

        .footer-links button {
          display: block;
          color: #d8b4fe;
          margin-bottom: 6px;
          transition: 0.2s;
        }

        .footer-links button:hover {
          color: white;
        }

        .footer-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          transition: 0.2s;
        }

        .footer-icon:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </footer>
  );
}