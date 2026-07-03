// components/common/ContactForm.jsx
import React, { useState } from 'react';
import { submitContact } from '../../utils/api'; // Import specific function

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    try {
      await submitContact(formData); // Use imported function directly
      setSuccess('Message sent successfully!');
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (err) {
      setError('Error sending message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="section contact">
      <div className="container">
        <div className="section-header">
          <h2>Contact Us</h2>
          <p>We'd love to hear from you and welcome you to our church family</p>
        </div>
        <div className="contact-container">
          <div className="contact-info">
            <h3>Get In Touch</h3>
              <div className="contact-item">
              <i className="fas fa-map-marker-alt"></i>
              <div>
                <h4>Location</h4>
                <p>A3313 Rd 3935<br />Mtubatuba, South Africa</p>
              </div>
            </div>
            <div className="contact-item">
              <i className="fas fa-clock"></i>
              <div>
                <h4>Service Times</h4>
                <p>Sunday: 10:00 AM - 12:00 PM<br />Wednesday: 6:00 PM</p>
              </div>
            </div>
            <div className="contact-item">
              <i className="fas fa-phone"></i>
              <div>
                <h4>Phone Numbers</h4>
                <p>0727641137</p>
              </div>
            </div>
            <div className="contact-item">
              <i className="fas fa-envelope"></i>
              <div>
                <h4>Email</h4>
                <p>info@elchurch.site</p>
              </div>
            </div>
            <div className="contact-item">
              <i className="fas fa-parking"></i>
              <div>
                <h4>Parking</h4>
                <p>Ample parking available on site</p>
              </div>
            </div>
          </div>
          <div className="contact-form">
            <h3>Send us a Message</h3>
            {error && <div id="contact-error" className="error-message">{error}</div>}
            {success && <div className="success-message" style={{ color: 'var(--success)' }}>{success}</div>}
            <form id="contactForm" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a topic...</option>
                  <option value="visit">Planning a Visit</option>
                  <option value="prayer">Prayer Request</option>
                  <option value="ministry">Ministry Question</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  value={formData.message}
                  onChange={handleChange}
                  required
                ></textarea>
              </div>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
