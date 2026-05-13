import type { FC } from 'react';
import Image from 'next/image';
import logo from '@/img/logo-web360.png';

const AppIcon: FC = () => {
  return (
    <Image
      src={logo}
      alt="WEB 360"
      width={64}
      height={64}
      className="h-12 w-12 object-contain drop-shadow-sm sm:h-14 sm:w-14"
      priority
    />
  );
};

export default AppIcon;
