import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { memo, useCallback } from "react";
import { playButton, playConfirm } from "../../utils/sound";
import "./PreMatchHeader.css";

function PreMatchHeader() {
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    playConfirm(0.4);
    navigate("/lineup"); // Volta para a tela de escalação
  }, [navigate]);

  const handleButtonHover = useCallback(() => {
    playButton(0.3);
  }, []);

  return (
    <header className="prematch-header-bar">
      <img
        src="/images/headerart.png"
        alt=""
        className="prematch-header-bar__art"
        aria-hidden="true"
      />

      <div className="prematch-header-bar__content">
        <button
          className="prematch-header-bar__back"
          onClick={handleBack}
          onMouseEnter={handleButtonHover}
          aria-label="Return"
        >
          <ArrowLeft size={22} strokeWidth={2.4} />
          Return
        </button>

        <img
          src="/images/logo.webp"
          alt="Ballers logo"
          className="prematch-header-bar__logo"
        />

        {/* Espaçador para manter o logo centralizado, já que não tem o seletor na direita */}
        <div className="prematch-header-bar__spacer" />
      </div>
    </header>
  );
}

export default memo(PreMatchHeader);
