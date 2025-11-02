import { useEffect, useState } from 'react';
import api from '../services/api';

const AnnouncementBanner = () => {
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const response = await api.get('/settings/homepage');
        if (response?.announcementBanner?.isActive) {
          setBanner(response.announcementBanner);
        }
      } catch (error) {
        console.error('Error fetching announcement banner:', error);
      }
    };

    fetchBanner();
  }, []);

  if (!banner) return null;

  const fontSizeMap = {
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
  };

  const bannerStyle = {
    backgroundColor: banner.bgColor || '#f8d7da',
    color: banner.textColor || '#721c24',
    fontSize: fontSizeMap[banner.fontSize] || '16px',
    fontWeight: banner.fontWeight || 'normal',
    textAlign: 'center',
    padding: '12px 20px',
    width: '100%',
    cursor: banner.link ? 'pointer' : 'default',
  };

  const handleClick = () => {
    if (banner.link) {
      if (banner.link.startsWith('http')) {
        window.open(banner.link, '_blank');
      } else {
        window.location.href = banner.link;
      }
    }
  };

  return (
    <div style={bannerStyle} onClick={handleClick} role={banner.link ? 'button' : 'banner'}>
      {banner.message}
    </div>
  );
};

export default AnnouncementBanner;
