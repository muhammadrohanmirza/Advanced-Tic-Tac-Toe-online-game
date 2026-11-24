'use client';

import { useState, useEffect } from 'react';

export function useWindowSize() {
  const [size, setSize] = useState({
    width: 1024,
    height: 768,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    width: size.width,
    height: size.height,
    isMobile: size.width < 768,
    isTablet: size.width >= 768 && size.width < 1024,
    isDesktop: size.width >= 1024,
    isWide: size.width >= 1920,
    isTiny: size.width < 360,
  };
}
