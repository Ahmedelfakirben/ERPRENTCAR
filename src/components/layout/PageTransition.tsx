import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo201M from './Logo201M';
import './Preloader.css';

const PageTransition: React.FC = () => {
  const location = useLocation();
  useTranslation();
  
  const [show, setShow] = useState(false);
  const [exit, setExit] = useState(false);

  const isDashboard = location.pathname === '/';

  useEffect(() => {
    // Instant trigger
    setShow(true);
    setExit(false);

    // Timing based on page type
    // Dashboard gets the premium branded transition
    // Other pages get a much faster "simplified" version
    const duration = isDashboard ? 450 : 200; 

    setTimeout(() => {
      setExit(true);
      setTimeout(() => setShow(false), isDashboard ? 400 : 200);
    }, duration);

    return () => {
      setExit(true);
      setShow(false);
    };
  }, [location.pathname]);

  if (!show) return null;

  return (
    <div 
      className={`preloader-overlay ${exit ? 'exit' : ''}`} 
      style={{ 
        position: 'absolute', 
        zIndex: 800, 
        width: '100%', 
        height: '100%',
        background: isDashboard ? '#111827' : 'rgba(17, 24, 39, 0.4)', // Lighter for other pages
        backdropFilter: isDashboard ? 'none' : 'blur(4px)',
        transition: `opacity ${isDashboard ? '0.4s' : '0.2s'} ease`
      }}
    >
      {isDashboard ? (
        <div className="preloader-content" style={{ transform: 'scale(0.7)' }}>
          <div className="preloader-logo-wrap" style={{ animationDuration: '1.5s' }}>
            <Logo201M size="lg" variant="default" />
            <div className="preloader-shimmer"></div>
          </div>
          <div className="preloader-progress-container" style={{ width: '100px', marginTop: '-10px' }}>
            <div className="preloader-progress-bar" style={{ animationDuration: '0.8s' }}></div>
          </div>
        </div>
      ) : (
        // Simplified version for other pages: just a very fast shimmer
        <div className="flex items-center justify-center">
           <div className="w-12 h-12 border-2 border-gold/20 border-t-gold rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default PageTransition;
