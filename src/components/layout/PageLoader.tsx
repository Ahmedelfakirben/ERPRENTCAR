import React from 'react';
import Logo201M from './Logo201M';
import './Preloader.css'; // Reuse some animations

const PageLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-12 animate-fade-in" style={{ minHeight: '300px', width: '100%' }}>
      <div className="preloader-logo-wrap mb-8">
        <Logo201M size="lg" variant="default" />
        <div className="preloader-shimmer"></div>
      </div>
      
      <div className="preloader-progress-container" style={{ width: '120px' }}>
        <div className="preloader-progress-bar" style={{ animation: 'preloader-progress-infinite 1.5s ease-in-out infinite' }}></div>
      </div>
      
      <div className="mt-4 text-[10px] font-bold text-secondary tracking-widest uppercase opacity-40 animate-pulse">
        Sincronización...
      </div>
    </div>
  );
};

export default PageLoader;
