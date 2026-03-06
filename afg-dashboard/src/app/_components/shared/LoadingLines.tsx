import React from "react";

const LoadingLines: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="gooey-container" style={{ filter: "url('#goo')" }}>
        <div className="dot dot-1 bg-meritz-red dark:bg-red-500"></div>
        <div className="dot dot-2 bg-meritz-red dark:bg-red-500"></div>
        <div className="dot dot-3 bg-meritz-red dark:bg-red-500"></div>
      </div>

      <svg width="0" height="0" className="absolute hidden">
        <defs>
          <filter id="goo">
            <feGaussianBlur result="blur" stdDeviation="10" in="SourceGraphic" />
            <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -7" mode="matrix" in="blur" />
          </filter>
        </defs>
      </svg>

      <style jsx>{`
        .gooey-container {
          position: relative;
          width: 80px;
          height: 30px;
        }
        .dot {
          position: absolute;
          top: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          animation-timing-function: cubic-bezier(0.18, 0.89, 0.32, 1.28);
          animation-duration: 1.5s;
          animation-iteration-count: infinite;
        }
        .dot-1 {
          left: 0;
          animation-name: gooey-1;
        }
        .dot-2 {
          left: 28px;
          animation-name: gooey-2;
        }
        .dot-3 {
          left: 56px;
          animation-name: gooey-3;
        }

        @keyframes gooey-1 {
          0%, 100% { transform: translateX(0) scale(1); }
          50% { transform: translateX(28px) scale(0.6); }
        }
        @keyframes gooey-2 {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.4); }
        }
        @keyframes gooey-3 {
          0%, 100% { transform: translateX(0) scale(1); }
          50% { transform: translateX(-28px) scale(0.6); }
        }
      `}</style>
    </div>
  );
};

export default LoadingLines;
