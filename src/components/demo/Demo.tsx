export default function Demo() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "32px",
        position: "relative",
      }}
    >
      {/* Badge principal */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontFamily: "'Bebas Neue', 'Arial Narrow', sans-serif",
          fontSize: "1.8rem",
          letterSpacing: "3px",
          color: "#ffffff",
          background: "linear-gradient(135deg, rgba(109, 40, 217, 0.85), rgba(76, 29, 149, 0.75))",
          border: "1.5px solid rgba(192, 132, 252, 0.7)",
          padding: "10px 28px",
          clipPath: "polygon(12px 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0% 50%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          textShadow: "0 0 24px rgba(192, 132, 252, 0.9), 0 0 8px rgba(255,255,255,0.3)",
          boxShadow: "0 0 32px rgba(147, 51, 234, 0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
          animation: "demoBadgePulse 2.5s ease-in-out infinite",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Shimmer */}
        <div style={{
          position: "absolute",
          top: 0,
          left: "-100%",
          width: "60%",
          height: "100%",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)",
          transform: "skewX(-20deg)",
          animation: "demoShimmer 3s ease-in-out infinite",
        }} />

        {/* Dot pulsante */}
        <span style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: "#c084fc",
          flexShrink: 0,
          animation: "demoDot 1.5s ease-in-out infinite",
          boxShadow: "0 0 10px rgba(192, 132, 252, 1)",
        }} />

        DEMO

        {/* Diamond direito */}
        <span style={{
          width: "8px",
          height: "8px",
          background: "#c084fc",
          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
          flexShrink: 0,
          boxShadow: "0 0 8px rgba(192, 132, 252, 0.8)",
          animation: "demoDot 1.5s ease-in-out infinite 0.3s",
        }} />
      </div>

      <style>{`
        @keyframes demoBadgePulse {
          0%, 100% { box-shadow: 0 0 32px rgba(147, 51, 234, 0.6), inset 0 1px 0 rgba(255,255,255,0.1); }
          50%       { box-shadow: 0 0 52px rgba(147, 51, 234, 0.9), 0 0 80px rgba(147, 51, 234, 0.3), inset 0 1px 0 rgba(255,255,255,0.1); }
        }
        @keyframes demoDot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }
        @keyframes demoShimmer {
          0%   { left: -100%; }
          50%  { left: 160%; }
          100% { left: 160%; }
        }
      `}</style>
    </div>
  );
}
