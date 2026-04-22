import { Camera, Shield, TrendingUp, Users, Award, Zap, Mail, Phone, MapPin, MessageCircle} from 'lucide-react';

interface AboutPageProps {
  onNavigate: (page: string) => void;
}

export default function AboutPage({ onNavigate }: AboutPageProps) {
  const features = [
    {
      icon: Camera,
      title: 'Verified Photographers',
      description: 'All photographers go through KYC verification for your safety and trust.',
      color: '#3b82f6'
    },
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Safe and secure payment processing with buyer protection.',
      color: '#10b981'
    },
    {
      icon: TrendingUp,
      title: 'Quality Rankings',
      description: 'Transparent ranking system based on performance and client satisfaction.',
      color: '#f59e0b'
    },
    {
      icon: Users,
      title: 'Easy Booking',
      description: 'Simple booking process with real-time chat and calendar management.',
      color: '#8b5cf6'
    },
    {
      icon: Award,
      title: 'Portfolio Showcase',
      description: 'Instagram-style portfolios to showcase photographer work beautifully.',
      color: '#ec4899'
    },
    {
      icon: Zap,
      title: 'Gamified Experience',
      description: 'Earn points, climb rankings, and unlock achievements.',
      color: '#f97316'
    }
  ];

  return (
    <>
      <style>{`
        .about-container {
          min-height: 100vh;
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          padding-bottom: 6rem;
          max-width: 430px;
          margin: 0 auto;
        }

        .about-hero {
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          padding: 3rem 1.5rem;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .about-hero::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 300px;
          height: 300px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
        }

        .about-hero-content {
          position: relative;
          z-index: 1;
        }

        .about-logo {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .about-title {
          font-size: 2rem;
          font-weight: 700;
          color: white;
          margin-bottom: 0.75rem;
        }

        .about-subtitle {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          max-width: 350px;
          margin: 0 auto;
        }

        .about-content {
          padding: 2rem 1.5rem;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 1rem;
          text-align: center;
        }

        .section-description {
          font-size: 0.9375rem;
          color: #64748b;
          line-height: 1.7;
          margin-bottom: 2rem;
          text-align: center;
        }

        .features-grid {
          display: grid;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .feature-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: all 0.3s;
        }

        .feature-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .feature-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .feature-icon {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .feature-icon svg {
          width: 1.5rem;
          height: 1.5rem;
          color: white;
        }

        .feature-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
        }

        .feature-description {
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.6;
        }

        .stats-section {
          background: white;
          border-radius: 1.25rem;
          padding: 2rem 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          font-size: 1.875rem;
          font-weight: 700;
          color: #3b82f6;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .cta-section {
          text-align: center;
          margin-top: 2rem;
        }

        .cta-buttons {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .cta-btn {
          flex: 1;
          padding: 1rem;
          border-radius: 0.75rem;
          border: none;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .cta-btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .cta-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
        }

        .cta-btn-secondary {
          background: white;
          color: #3b82f6;
          border: 2px solid #3b82f6;
        }

        .cta-btn-secondary:hover {
          background: #eff6ff;
        }

        .contact-info-cards {
          display: grid;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .contact-info-card {
          background: white;
          border-radius: 1rem;
          padding: 1.25rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s;
        }

        .contact-info-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .contact-info-icon {
          width: 3rem;
          height: 3rem;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .contact-info-icon svg {
          width: 1.5rem;
          height: 1.5rem;
          color: white;
        }

        .contact-info-content {
          flex: 1;
        }

        .contact-info-label {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }

        .contact-info-value {
          font-size: 0.9375rem;
          color: #1e293b;
          font-weight: 500;
        }

        .social-section {
          text-align: center;
          margin-top: 2rem;
        }

        .social-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 1rem;
        }

        .social-links {
          display: flex;
          justify-content: center;
          gap: 1rem;
        }

        .social-link {
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          cursor: pointer;
          transition: all 0.3s;
        }

        .social-link:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .social-link svg {
          width: 1.5rem;
          height: 1.5rem;
        }

        .social-link.facebook { color: #1877f2; }
        .social-link.instagram { color: #e4405f; }
        .social-link.twitter { color: #1da1f2; }
        .social-link.whatsapp { color: #25d366; }
      `}</style>

      <div className="about-container">
        {/* Hero Section */}
        <div className="about-hero">
          <div className="about-hero-content">
            <div className="about-logo">📸</div>
            <h1 className="about-title">ClickSeekers</h1>
            <p className="about-subtitle">
              Nepal's Premier Photography Marketplace connecting clients with verified professional photographers
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="about-content">
          {/* What is ClickSeekers */}
          <h2 className="section-title">What is ClickSeekers?</h2>
          <p className="section-description">
            ClickSeekers is a cross-platform mobile marketplace designed specifically for Nepal's photography industry. 
            We bridge the gap between clients seeking professional photographers and talented photographers looking 
            to grow their business.
          </p>

          {/* Stats */}
          <div className="stats-section">
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">500+</div>
                <div className="stat-label">Photographers</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">2K+</div>
                <div className="stat-label">Bookings</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">4.8★</div>
                <div className="stat-label">Average Rating</div>
              </div>
            </div>
          </div>

          {/* Features */}
          <h2 className="section-title">Why Choose ClickSeekers?</h2>
          <div className="features-grid">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="feature-card">
                  <div className="feature-header">
                    <div className="feature-icon" style={{ backgroundColor: feature.color }}>
                      <Icon />
                    </div>
                    <h3 className="feature-title">{feature.title}</h3>
                  </div>
                  <p className="feature-description">{feature.description}</p>
                </div>
              );
            })}
          </div>

          {/* CTA Section */}
          <div className="cta-section">
            <h2 className="section-title">Ready to Get Started?</h2>
            <p className="section-description">
              Join thousands of satisfied clients and photographers on ClickSeekers today!
            </p>
            <div className="cta-buttons">
              <button 
                className="cta-btn cta-btn-primary"
                onClick={() => onNavigate('login')}
              >
                Get Started
              </button>
              <button 
                className="cta-btn cta-btn-secondary"
                onClick={() => onNavigate('points-system')}
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Contact Information Section */}
          <div style={{ marginTop: '3rem' }}>
            <h2 className="section-title">Get In Touch</h2>
            <p className="section-description">Have questions? We're here to help!</p>

            <div className="contact-info-cards">
              <div className="contact-info-card">
                <div className="contact-info-icon" style={{ backgroundColor: '#3b82f6' }}>
                  <Mail />
                </div>
                <div className="contact-info-content">
                  <div className="contact-info-label">Email Us</div>
                  <div className="contact-info-value">support@clickseekers.com</div>
                </div>
              </div>

              <div className="contact-info-card">
                <div className="contact-info-icon" style={{ backgroundColor: '#10b981' }}>
                  <Phone />
                </div>
                <div className="contact-info-content">
                  <div className="contact-info-label">Call Us</div>
                  <div className="contact-info-value">+977 9800000000</div>
                </div>
              </div>

              <div className="contact-info-card">
                <div className="contact-info-icon" style={{ backgroundColor: '#f59e0b' }}>
                  <MapPin />
                </div>
                <div className="contact-info-content">
                  <div className="contact-info-label">Visit Us</div>
                  <div className="contact-info-value">Kathmandu, Nepal</div>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="social-section">
              <h3 className="social-title">Follow Us</h3>
              <div className="social-links">
                <a href="#" className="social-link facebook">
                  <Facebook />
                </a>
                <a href="#" className="social-link instagram">
                  <Instagram />
                </a>
                <a href="#" className="social-link twitter">
                  <Twitter />
                </a>
                <a href="#" className="social-link whatsapp">
                  <MessageCircle />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}