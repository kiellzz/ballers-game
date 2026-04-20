import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { playButton, playConfirm } from "../../utils/sound";
import "./PackHeader.css";

export default function PackHeader() {
  const navigate = useNavigate();

  const handleBack = () => {
    playConfirm(0.4);
    navigate("/");
  };

  return (
    <header className="pack-header">
      <img
        src="/images/headerart.png"
        alt=""
        className="pack-header__art"
        aria-hidden="true"
      />

      <div className="pack-header__content">
        <button
          className="pack-header__back"
          onClick={handleBack}
          onMouseEnter={() => playButton(0.3)}
          aria-label="Return"
        >
          <ArrowLeft size={22} strokeWidth={2.4} />
          Return
        </button>

        <img
          src="/images/logo.webp"
          alt="Ballers logo"
          className="pack-header__logo"
        />
      </div>
    </header>
  );
}
