import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Logo201M from './Logo201M';
import './Preloader.css';

const Preloader: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [show, setShow] = useState(true);
  const [exit, setExit] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExit(true);
      setTimeout(() => setShow(false), 800);
    }, 2000); // Initial boot time
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className={`preloader-overlay ${exit ? 'exit' : ''}`}>
      <div className="preloader-content">
        <div className="preloader-logo-wrap">
          <Logo201M size="xl" variant="default" />
          <div className="preloader-shimmer"></div>
        </div>
        <div className="preloader-progress-container">
          <div className="preloader-progress-bar"></div>
        </div>
        <div className="preloader-text">
          <span>{exit ? (isAr ? 'جاهز' : 'Prêt') : (isAr ? 'جاري التحميل...' : 'Chargement...')}</span>
        </div>
      </div>
    </div>
  );
};

export default Preloader;
