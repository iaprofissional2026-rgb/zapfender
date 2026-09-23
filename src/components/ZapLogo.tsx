import React from 'react';

interface ZapLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export const ZapLogo: React.FC<ZapLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Brand Icon Badge with glowing red-black gradient */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-rose-600 to-black rounded-2xl blur-xs opacity-75 group-hover:opacity-100 transition duration-300" />
        <div
          className={`${iconSizes[size]} relative rounded-2xl bg-gradient-to-tr from-red-600 via-rose-700 to-zinc-950 flex items-center justify-center text-white font-black shadow-lg shadow-red-600/30 border border-white/20`}
        >
          {/* Vector Emblem: WhatsApp speech bubble + Turbo Bolt */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-3/5 h-3/5 drop-shadow-md"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* WhatsApp Speech Bubble contour */}
            <path
              d="M12 2C6.48 2 2 6.48 2 12C2 13.85 2.5 15.58 3.38 17.06L2.25 21.2C2.15 21.56 2.45 21.87 2.81 21.78L7.02 20.73C8.47 21.55 10.18 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Turbo Lightning Bolt in Center */}
            <path
              d="M13 6L7.5 13.5H12L11 18.5L16.5 11H12L13 6Z"
              fill="#ffffff"
              stroke="#ffffff"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Typography */}
      <div>
        <div className={`font-black tracking-tight text-slate-900 flex items-center gap-1.5 ${textSizes[size]}`}>
          <span>ZapSender</span>
          <span className="bg-gradient-to-r from-red-600 via-rose-600 to-black bg-clip-text text-transparent">
            Turbo
          </span>
          <span className="text-[9px] uppercase tracking-wider font-extrabold bg-gradient-to-r from-red-600 to-black text-white px-1.5 py-0.5 rounded-md shadow-2xs">
            PRO
          </span>
        </div>
        {showSubtitle && (
          <div className="text-[10px] font-semibold text-slate-500 tracking-tight leading-none mt-0.5">
            Disparador WhatsApp • Grupos & Contatos Reais
          </div>
        )}
      </div>
    </div>
  );
};
