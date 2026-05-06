import React from 'react';
import logoSvg from '../../assets/logo.svg';

interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'badge' | 'print';
}

const Logo201M: React.FC<LogoProps> = ({ className = '', size = 'md', variant = 'default' }) => {
  const sizes = {
    xs: { height: '24px' },
    sm: { height: '32px' },
    md: { height: '48px' },
    lg: { height: '64px' },
    xl: { height: '96px' }
  };

  const curr = sizes[size];

  if (variant === 'badge' || variant === 'print') {
    return (
      <div className={`logo-badge ${className}`} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8px',
        width: 'fit-content'
      }}>
        <img 
          src={logoSvg} 
          alt="2S1M Rent Car" 
          style={{ height: curr.height, width: 'auto', objectFit: 'contain' }} 
        />
      </div>
    );
  }

  return (
    <div className={className} style={{ padding: '8px 0', display: 'flex', alignItems: 'center' }}>
      <img 
        src={logoSvg} 
        alt="2S1M Rent Car" 
        style={{ height: curr.height, width: 'auto', objectFit: 'contain' }} 
      />
    </div>
  );
};

export default Logo201M;
