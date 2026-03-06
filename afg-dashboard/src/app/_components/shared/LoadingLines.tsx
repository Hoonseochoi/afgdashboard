import React from "react";

const LoadingLines: React.FC = () => {
  const letters = "Loading".split("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="relative flex items-center justify-center w-auto font-poppins text-lg font-semibold select-none text-white z-10">
        {letters.map((letter, idx) => (
          <span
            key={idx}
            className="relative inline-block opacity-0 z-[2] animate-[letterAnim_1s_linear_infinite] text-primary"
            style={{ animationDelay: `${0.1 + idx * 0.105}s` }}
          >
            {letter}
          </span>
        ))}
      </div>
      <style jsx>{`
        @keyframes letterAnim {
          0% { opacity: 0; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-5px); text-shadow: 0 2px 4px rgba(239,59,36,0.5); }
          100% { opacity: 0; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default LoadingLines;
