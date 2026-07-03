import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, Home, Mail, Phone, MapPin, User, Heart, Calendar, Users } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import IOSLoadingBar from '../components/IOSLoadingBar';

const PrivacyPolicy = () => {
  const { settings, loading } = useSettings();
  const [contentLoading, setContentLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // Simulate loading progress
  useEffect(() => {
    if (!loading) {
      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer);
            setTimeout(() => setContentLoading(false), 300);
            return 100;
          }
          return prev + (100 - prev) * 0.3;
        });
      }, 100);
      
      return () => clearInterval(timer);
    }
  }, [loading]);

  // Consistent church information matching the About section
  const churchInfo = {
    name: settings?.churchName || 'Eternal Love Church',
    email: settings?.email || 'info@elchurch.site',
    phone: settings?.phone || '0727641137',
    address: settings?.address || 'A3313 Rd 3935, Nkodibe, Mtubatuba, 3935, South Africa',
    pastor: settings?.pastorName || 'Apostle Vangeli Sibisi & Prophetess Nokwanda Sibisi',
    phone2: '0727641137',
    foundingDate: '7 July 2019',
    coreBeliefs: 'Love is the foundation for all spiritual gifts. A Christian\'s identity is shaped by love — not by talents or abilities.',
    tagline: 'We love God and love people',
    conference: 'Emerge Apostolic Conference'
  };

  // Show loading state
  if (contentLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <IOSLoadingBar />
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-sm mx-auto px-4"
          >
            {/* Church Logo/Icon */}
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <Heart size={32} className="text-white" />
            </motion.div>
            
            {/* Loading Text */}
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-gray-900 mb-2"
            >
              {churchInfo.name}
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-gray-600 mb-2"
            >
              {churchInfo.tagline}
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-sm text-gray-500 mb-6"
            >
              Loading Privacy Policy...
            </motion.p>

            {/* iOS-style Progress Bar Container */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden"
            >
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: progress / 100 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full origin-left"
                style={{ transformOrigin: '0% 50%' }}
              />
            </motion.div>

            {/* Progress Percentage */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-gray-500 font-medium"
            >
              {Math.round(progress)}%
            </motion.p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Main Content
  return (
    <div className="min-h-screen bg-gray-50">
      {/* iOS Loading Bar for page transitions */}
      <IOSLoadingBar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Shield size={32} className="text-purple-600" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            How we protect and use your information at {churchInfo.name}
          </p>
        </motion.div>

        {/* Church Information Card - Dynamic with consistent About info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-6 mb-8 text-white shadow-lg"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">{churchInfo.name}</h2>
              <p className="text-purple-100 opacity-90 text-sm">
                {churchInfo.tagline}
              </p>
              <p className="text-purple-200 text-xs mt-1">
                Founded {churchInfo.foundingDate}
              </p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-purple-200 opacity-80">Leadership</p>
              <p className="font-semibold text-white">{churchInfo.pastor}</p>
            </div>
          </div>
          
          {/* Core Beliefs */}
          <div className="mt-4 pt-3 border-t border-purple-500">
            <div className="flex items-center space-x-2">
              <Heart size={14} className="text-purple-200" />
              <p className="text-xs text-purple-100 italic">{churchInfo.coreBeliefs}</p>
            </div>
          </div>
          
          {/* Contact Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-4 border-t border-purple-500">
            <div className="flex items-center space-x-3">
              <Phone size={16} className="text-purple-200" />
              <div>
                <p className="text-xs text-purple-200 opacity-80">Primary Phone</p>
                <p className="text-sm font-medium">{churchInfo.phone}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Phone size={16} className="text-purple-200" />
              <div>
                <p className="text-xs text-purple-200 opacity-80">Secondary Phone</p>
                <p className="text-sm font-medium">{churchInfo.phone2}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Mail size={16} className="text-purple-200" />
              <div>
                <p className="text-xs text-purple-200 opacity-80">Email</p>
                <p className="text-sm font-medium">{churchInfo.email}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <MapPin size={16} className="text-purple-200" />
              <div>
                <p className="text-xs text-purple-200 opacity-80">Location</p>
                <p className="text-sm font-medium">Mtubatuba, KwaZulu-Natal</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Key Events Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8"
        >
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">Annual Event</p>
              <p className="text-sm text-amber-700">
                <strong>{churchInfo.conference}</strong> — Emerging and manifesting divine purpose through faith and prophetic revelation.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Last Updated */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-blue-900 mb-2">
                Last Updated
              </h2>
              <p className="text-blue-700">
                This Privacy Policy was last updated on {new Date().toLocaleDateString('en-ZA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div className="text-center sm:text-right">
              <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                <Shield size={14} className="mr-1" />
                POPIA Compliant
              </div>
            </div>
          </div>
        </motion.div>

        {/* Privacy Policy Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="p-6 sm:p-8 space-y-8">
            {/* Section 1: Introduction */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  <strong>{churchInfo.name}</strong> is a dynamic, vibrant church of the Holy Ghost, built upon the foundation of apostles and prophets. We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website <strong>elchurch.site</strong> and use our services.
                </p>
                <p>
                  As a Christian church community that loves God and loves people, we value transparency and want you to feel confident about how we handle your personal data. This policy complies with the Protection of Personal Information Act (POPIA) of South Africa.
                </p>
              </div>
            </section>

            {/* Section 2: Information We Collect */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  We may collect personal information that you voluntarily provide to us when you:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Register for church events, including the annual <strong>{churchInfo.conference}</strong></li>
                  <li>Subscribe to our newsletter or prayer requests</li>
                  <li>Contact us for pastoral care or prayer support</li>
                  <li>Make donations or offerings</li>
                  <li>Join our small groups or ministry teams</li>
                </ul>
                <p>
                  The types of information we may collect include your name, email address, phone number, physical address, and any other information you choose to provide.
                </p>
              </div>
            </section>

            {/* Section 3: How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Communicate with you about services, events, and ministry opportunities</li>
                  <li>Provide pastoral care and prayer support</li>
                  <li>Process donations and issue tax-deductible receipts</li>
                  <li>Improve our website and ministry offerings</li>
                  <li>Send you updates about the annual <strong>{churchInfo.conference}</strong> and other church events</li>
                  <li>Respond to your inquiries and prayer requests</li>
                </ul>
              </div>
            </section>

            {/* Section 4: Legal Basis for Processing (POPIA) */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Legal Basis for Processing (POPIA)</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Under South Africa's Protection of Personal Information Act (POPIA), we process your personal information based on one or more of the following legal grounds:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Consent:</strong> You have given clear consent for us to process your personal information for a specific purpose.</li>
                  <li><strong>Contract:</strong> The processing is necessary for a contract we have with you.</li>
                  <li><strong>Legal obligation:</strong> The processing is necessary for us to comply with the law.</li>
                  <li><strong>Legitimate interests:</strong> The processing is necessary for our legitimate interests as a church community.</li>
                </ul>
              </div>
            </section>

            {/* Section 5: Information Sharing */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Information Sharing</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  We do not sell, trade, or rent your personal information to third parties. We may share your information with:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Church leadership, including {churchInfo.pastor}, for pastoral care purposes</li>
                  <li>Service providers who assist us in operating our website and ministry</li>
                  <li>Legal authorities when required by law</li>
                </ul>
              </div>
            </section>

            {/* Section 6: Data Security */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Security</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These include:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>SSL encryption for data transmission</li>
                  <li>Secure servers and firewalls</li>
                  <li>Limited access to personal information on a need-to-know basis</li>
                  <li>Regular security assessments</li>
                </ul>
              </div>
            </section>

            {/* Section 7: Your Rights Under POPIA */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights Under POPIA</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>Under POPIA, you have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Request access to your personal information</li>
                  <li>Request correction of inaccurate or incomplete information</li>
                  <li>Request deletion of your personal information</li>
                  <li>Object to the processing of your information</li>
                  <li>Withdraw consent at any time</li>
                  <li>Lodge a complaint with the Information Regulator of South Africa</li>
                </ul>
              </div>
            </section>

            {/* Section 8: Cookies and Tracking */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Cookies and Tracking</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Our website uses cookies to enhance your browsing experience. Cookies are small text files stored on your device that help us understand how you use our site. You can control cookie settings through your browser preferences.
                </p>
              </div>
            </section>

            {/* Section 9: Children's Privacy */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  We are committed to protecting children's privacy. We do not knowingly collect personal information from children under 13 without parental consent. If you believe we have collected information from a child without proper consent, please contact us immediately.
                </p>
              </div>
            </section>

            {/* Section 10: Third-Party Links */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Third-Party Links</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Our website may contain links to third-party websites. We are not responsible for the privacy practices or content of these external sites. We encourage you to review their privacy policies before providing any personal information.
                </p>
              </div>
            </section>

            {/* Section 11: Changes to This Policy */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to This Policy</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated "Last Updated" date. We encourage you to review this policy periodically to stay informed about how we protect your information.
                </p>
              </div>
            </section>

            {/* Section 12: Contact Us - Updated with Consistent Info */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Us</h2>
              <div className="bg-purple-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-4">
                  Questions About Our Privacy Policy?
                </h3>
                <p className="text-gray-700 mb-4">
                  If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your personal information, please contact our Information Officer:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Mail size={20} className="text-purple-600" />
                      <div>
                        <p className="text-sm text-purple-700 font-medium">Email</p>
                        <p className="text-gray-700">{churchInfo.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone size={20} className="text-purple-600" />
                      <div>
                        <p className="text-sm text-purple-700 font-medium">Primary Phone</p>
                        <p className="text-gray-700">{churchInfo.phone}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Phone size={20} className="text-purple-600" />
                      <div>
                        <p className="text-sm text-purple-700 font-medium">Secondary Phone</p>
                        <p className="text-gray-700">{churchInfo.phone2}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MapPin size={20} className="text-purple-600" />
                      <div>
                        <p className="text-sm text-purple-700 font-medium">Location</p>
                        <p className="text-gray-700">{churchInfo.address}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <div className="flex items-center space-x-3">
                    <Users size={16} className="text-purple-600" />
                    <div>
                      <p className="text-sm text-purple-700 font-medium">Leadership / Information Officers</p>
                      <p className="text-gray-700 font-medium">{churchInfo.pastor}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </motion.div>

        {/* Footer Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8"
        >
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <Home size={18} className="mr-2" />
            Back to Home
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-purple-600 transition-all duration-300"
          >
            <Mail size={18} className="mr-2" />
            Contact Us
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;