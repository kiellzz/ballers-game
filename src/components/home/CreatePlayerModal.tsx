import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { Player, Position, PlayerStats, GKStats } from "../../types/PlayerTypes";
import { getCountryCode, getAllCountries } from "../../utils/getCountryCode";
import { calcOverall, suggestPosition } from "../../utils/playerOverall";
import PlayerCard from "../player-card/PlayerCard";
import { useImageCrop } from "../../hooks/useImageCrop";
import "./CreatePlayerModal.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type CreatePlayerModalProps = {
  onClose: () => void;
  onSave: (player: Player) => void;
  /** Names of real players — custom players cannot share these names */
  reservedNames: string[];
};

type Step = "info" | "stats" | "preview";

// ── Constants ─────────────────────────────────────────────────────────────────

const POSITIONS: Position[] = [
  "GK", "LB", "CB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST",
];

const NATIONALITIES = getAllCountries();

const OUTFIELD_STAT_KEYS: (keyof PlayerStats)[] = [
  "pace", "shooting", "passing", "dribbling", "defending", "physical",
];

const GK_STAT_KEYS: (keyof GKStats)[] = [
  "diving", "handling", "kicking", "reflexes", "speed", "positioning",
];

const OUTFIELD_LABELS: Record<keyof PlayerStats, string> = {
  pace: "SPD", shooting: "SHO", passing: "PAS",
  dribbling: "DRI", defending: "DEF", physical: "PHY",
};

const GK_LABELS: Record<keyof GKStats, string> = {
  diving: "DIV", handling: "HAN", kicking: "KIC",
  reflexes: "REF", speed: "SPD", positioning: "POS",
};

const STEPS: { key: Step; label: string }[] = [
  { key: "info",    label: "Info"    },
  { key: "stats",   label: "Stats"   },
  { key: "preview", label: "Preview" },
];

const STEP_ORDER: Step[] = ["info", "stats", "preview"];

// ── Defaults ──────────────────────────────────────────────────────────────────

function defaultOutfieldStats(): PlayerStats {
  return { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 50, physical: 70 };
}

function defaultGKStats(): GKStats {
  return { diving: 70, handling: 70, kicking: 65, reflexes: 70, speed: 55, positioning: 70 };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreatePlayerModal({ onClose, onSave, reservedNames }: CreatePlayerModalProps) {
  const [step, setStep] = useState<Step>("info");

  // ── Step 1: Info ──────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [nationality, setNationality] = useState("Brazil");
  const [height, setHeight] = useState(180);
  const [displayFullName, setDisplayFullName] = useState(false);
  const [isLegend, setIsLegend] = useState(false);

  // Photo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgError, setBgError] = useState(false);

  const {
    imgRef,
    containerRef,
    isDragging,
    sizeSliderValue,
    cssPercent,
    handleImageLoad,
    handleSizeChange,
    handleCropMouseDown,
    applyCrop,
  } = useImageCrop();

  // ── Step 2: Stats + Positions ─────────────────────────────────────────────
  const [position, setPosition] = useState<Position>("ST");
  const [secondaryPositions, setSecondaryPositions] = useState<Position[]>([]);
  const [outfieldStats, setOutfieldStats] = useState<PlayerStats>(defaultOutfieldStats);
  const [gkStats, setGKStats] = useState<GKStats>(defaultGKStats);
  const [suggestedPos, setSuggestedPos] = useState<Position | null>(null);

  const isGK = position === "GK";
  const currentStats = isGK ? gkStats : outfieldStats;

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const maxLen = displayFullName ? 15 : 30;
    const val = e.target.value.slice(0, maxLen);
    setName(val);
    const trimmed = val.trim().toLowerCase();
    if (reservedNames.some(n => n.toLowerCase() === trimmed)) {
      setNameError("This name belongs to a real player in the database.");
    } else {
      setNameError(null);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawImage(ev.target?.result as string);
      setCroppedImage(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleApplyCrop() {
    const result = await applyCrop();
    setCroppedImage(result);
  }

  async function handleRemoveBg() {
    const source = croppedImage ?? rawImage;
    if (!source) return;
    setIsRemovingBg(true);
    try {
      const res = await fetch(source);
      const blob = await res.blob();
      const formData = new FormData();
      formData.append("image_file", blob, "player.webp");
      formData.append("size", "auto");

      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": import.meta.env.VITE_REMOVE_BG_API_KEY },
        body: formData,
      });

      if (!response.ok) throw new Error("remove.bg failed");

      const resultBlob = await response.blob();
      const reader = new FileReader();
      reader.onload = (ev) => setCroppedImage(ev.target?.result as string);
      reader.readAsDataURL(resultBlob);
    } catch (err) {
      console.error("BG removal failed:", err);
      setBgError(true);
      setTimeout(() => setBgError(false), 4000);
    } finally {
      setIsRemovingBg(false);
    }
  }

  function handleOutfieldStat(key: keyof PlayerStats, val: number) {
    setOutfieldStats(prev => ({ ...prev, [key]: val }));
    setSuggestedPos(null);
  }

  function handleGKStat(key: keyof GKStats, val: number) {
    setGKStats(prev => ({ ...prev, [key]: val }));
  }

  function handleSuggestPosition() {
    if (isGK) {
      setSuggestedPos("GK");
      return;
    }
    const suggested = suggestPosition(outfieldStats);
    setSuggestedPos(suggested);
    setPosition(suggested);
  }

  function toggleSecondary(pos: Position) {
    if (isGK) return;
    if (pos === position) return;
    setSecondaryPositions(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos].slice(0, 3)
    );
  }

  function handlePositionChange(pos: Position) {
    setPosition(pos);
    setSecondaryPositions([]);
    setSuggestedPos(null);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function canProceed(): boolean {
    if (step === "info") return name.trim().length >= 2 && nameError === null;
    return true;
  }

  function goNext() {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  }

  function goBack() {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  function handleSave() {
    const stats = isGK ? gkStats : outfieldStats;
    const overall = calcOverall(stats, isGK, position);

    const player: Player = {
      id: Date.now(),
      name: name.trim(),
      overall,
      position,
      secondaryPositions: secondaryPositions.length > 0 ? secondaryPositions : undefined,
      nationality,
      stats,
      height,
      displayFullName: displayFullName || undefined,
      isLegend: isLegend || undefined,
      customImage: croppedImage ?? undefined,
      isCustom: true,
    };

    onSave(player);
    onClose();
  }

  // ── Preview player ────────────────────────────────────────────────────────

  const previewPlayer: Player = {
    id: 0,
    name: name || "Your Player",
    overall: calcOverall(currentStats, isGK, position),
    position,
    secondaryPositions: secondaryPositions.length > 0 ? secondaryPositions : undefined,
    nationality,
    stats: currentStats,
    height,
    displayFullName: displayFullName || undefined,
    isLegend: isLegend || undefined,
    customImage: croppedImage ?? "/images/players/default.webp",
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return createPortal(
    <div className="create-modal__overlay" onClick={onClose}>
      <div className="create-modal__dialog" onClick={e => e.stopPropagation()}>

        {/* Close */}
        <button className="card-modal__close" onClick={onClose} aria-label="Close">✕</button>

        {/* Header */}
        <div className="card-modal__header">
          <span className="card-modal__header-name">Create Player</span>
          <div className="card-modal__header-positions">
            {STEPS.map((s, i) => (
              <span
                key={s.key}
                className={`card-modal__position-badge ${step === s.key ? "card-modal__position-badge--primary" : ""} create-modal__step-badge`}
                onClick={() => {
                  const current = STEP_ORDER.indexOf(step);
                  if (i <= current) setStep(s.key);
                }}
              >
                {i + 1}. {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="create-modal__body">

          {/* ── STEP 1: INFO + PHOTO ── */}
          {step === "info" && (
            <div className="create-modal__step create-modal__step--info">

              {/* Left column: form fields */}
              <div className="create-modal__info-fields">
                <div className="create-modal__field">
                  <label className="create-modal__label">Player name</label>
                  <input
                    className="create-modal__input"
                    type="text"
                    placeholder="e.g. Ronaldinho"
                    value={name}
                    onChange={handleNameChange}
                    maxLength={displayFullName ? 15 : 30}
                    autoFocus
                  />
                  {nameError && (
                    <span className="create-modal__field-error">{nameError}</span>
                  )}
                </div>

                <div className="create-modal__row">
                  <div className="create-modal__field">
                    <label className="create-modal__label">Nationality</label>
                    <select
                      className="create-modal__input create-modal__select"
                      value={nationality}
                      onChange={e => setNationality(e.target.value)}
                    >
                      {NATIONALITIES.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <img
                      src={`https://flagcdn.com/24x18/${getCountryCode(nationality)}.png`}
                      alt={nationality}
                      className="create-modal__flag-preview"
                    />
                  </div>

                  <div className="create-modal__field">
                    <label className="create-modal__label">Height (cm)</label>
                    <div className="create-modal__height-control">
                      <div className="create-modal__height-arrows">
                        <button
                          type="button"
                          className="create-modal__height-arrow-btn"
                          onClick={() => setHeight(h => Math.min(210, h + 1))}
                        >
                          <ChevronUp size={14} strokeWidth={3} />
                        </button>
                        <button
                          type="button"
                          className="create-modal__height-arrow-btn"
                          onClick={() => setHeight(h => Math.max(150, h - 1))}
                        >
                          <ChevronDown size={14} strokeWidth={3} />
                        </button>
                      </div>
                      <span className="create-modal__height-value">{height}</span>
                    </div>
                  </div>
                </div>

                <div className="create-modal__checkboxes">
                  <label className="create-modal__checkbox-label">
                    <input
                      type="checkbox"
                      checked={displayFullName}
                      onChange={e => {
                        setDisplayFullName(e.target.checked);
                        if (e.target.checked && name.length > 15) {
                          setName(name.slice(0, 15));
                        }
                      }}
                      className="create-modal__checkbox"
                    />
                    Show full name on card
                  </label>

                  <label className="create-modal__checkbox-label">
                    <input
                      type="checkbox"
                      checked={isLegend}
                      onChange={e => setIsLegend(e.target.checked)}
                      className="create-modal__checkbox"
                    />
                    Legend card
                  </label>
                </div>
              </div>

              {/* Right column: photo upload */}
              <div className="create-modal__info-photo">
                <div className="create-modal__photo-hint">
                  💡 Use images with transparent background for best results
                </div>
                {!rawImage ? (
                  <label className="create-modal__upload-zone create-modal__upload-zone--inline">
                    <img
                      src="/images/players/default.webp"
                      alt="Default player"
                      className="create-modal__photo-placeholder"
                    />
                    <div className="create-modal__upload-overlay">
                      <span className="create-modal__upload-icon">📸</span>
                      <span className="create-modal__upload-text">Upload photo</span>
                      <span className="create-modal__upload-hint">optional · PNG, JPG, WEBP</span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                  </label>
                ) : (
                  <div className="create-modal__crop-area create-modal__crop-area--inline">
                    <div
                      className="create-modal__crop-container"
                      ref={containerRef}
                      style={{ position: "relative", display: "inline-block" }}
                    >
                      <img
                        ref={imgRef}
                        src={rawImage}
                        alt="Upload"
                        className="create-modal__crop-img"
                        onLoad={handleImageLoad}
                        draggable={false}
                      />

                      <div
                        className="create-modal__crop-overlay"
                        style={{
                          position: "absolute",
                          inset: 0,
                          pointerEvents: "none",
                          background: "rgba(0,0,0,0.55)",
                          clipPath: [
                            "polygon(",
                            "0% 0%, 100% 0%, 100% 100%, 0% 100%,",
                            `0% ${cssPercent.yPct}%,`,
                            `${cssPercent.xPct}% ${cssPercent.yPct}%,`,
                            `${cssPercent.xPct}% ${cssPercent.yPct + cssPercent.hPct}%,`,
                            `${cssPercent.xPct + cssPercent.wPct}% ${cssPercent.yPct + cssPercent.hPct}%,`,
                            `${cssPercent.xPct + cssPercent.wPct}% ${cssPercent.yPct}%,`,
                            `0% ${cssPercent.yPct}%`,
                            ")",
                          ].join(" "),
                        }}
                      />

                      <div
                        className="create-modal__crop-box"
                        style={{
                          position: "absolute",
                          left: `${cssPercent.xPct}%`,
                          top: `${cssPercent.yPct}%`,
                          width: `${cssPercent.wPct}%`,
                          height: `${cssPercent.hPct}%`,
                          cursor: isDragging ? "grabbing" : "grab",
                        }}
                        onMouseDown={handleCropMouseDown}
                      />
                    </div>

                    <div className="create-modal__crop-controls">
                      <input
                        type="range"
                        min={20}
                        max={100}
                        value={sizeSliderValue}
                        onChange={e => handleSizeChange(Number(e.target.value))}
                        className="create-modal__slider"
                      />
                    </div>

                    <div className="create-modal__photo-actions create-modal__photo-actions--inline">
                      <button type="button" className="create-modal__photo-btn" onClick={handleApplyCrop}>
                        ✂ Crop & Save
                      </button>
                      <button
                        type="button"
                        className={`create-modal__photo-btn create-modal__photo-btn--bg ${bgError ? "create-modal__photo-btn--bg-error" : ""}`}
                        onClick={() => { setBgError(false); handleRemoveBg(); }}
                        disabled={isRemovingBg}
                        title={bgError ? "Service unavailable. Try again later." : "Remove background"}
                      >
                        {isRemovingBg ? "..." : bgError ? "✦ Unavailable" : "✦ Remove BG"}
                      </button>
                      <button
                        type="button"
                        className="create-modal__photo-btn create-modal__photo-btn--reset"
                        onClick={() => { setRawImage(null); setCroppedImage(null); }}
                      >
                        Remove Image
                      </button>
                    </div>

                    {croppedImage && (
                      <div className="create-modal__crop-result">
                        <span className="create-modal__label">Result</span>
                        <img src={croppedImage} alt="Cropped" className="create-modal__crop-thumb" />
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ── STEP 2: STATS + POSITIONS ── */}
          {step === "stats" && (
            <div className="create-modal__step create-modal__step--stats">

              <div className="create-modal__stats-grid">
                {(isGK ? GK_STAT_KEYS : OUTFIELD_STAT_KEYS).map(key => {
                  const val = (currentStats as unknown as Record<string, number>)[key]
                  const label = isGK
                    ? GK_LABELS[key as keyof GKStats]
                    : OUTFIELD_LABELS[key as keyof PlayerStats];
                  return (
                    <div key={key} className="create-modal__stat-row">
                      <span className="create-modal__stat-label">{label}</span>
                      <input
                        type="range"
                        min={1}
                        max={99}
                        value={val}
                        className="create-modal__slider"
                        onChange={e =>
                          isGK
                            ? handleGKStat(key as keyof GKStats, Number(e.target.value))
                            : handleOutfieldStat(key as keyof PlayerStats, Number(e.target.value))
                        }
                      />
                      <span className="create-modal__stat-value">{val}</span>
                    </div>
                  );
                })}
              </div>

              <div className="create-modal__overall-preview">
                <span className="create-modal__overall-label">Overall</span>
                <span className="create-modal__overall-value">
                  {calcOverall(currentStats, isGK, position)}
                </span>
              </div>

              <div className="create-modal__field create-modal__field--compact">
                <label className="create-modal__label">Primary position</label>
                <div className="create-modal__positions-grid">
                  {POSITIONS.map(pos => (
                    <button
                      key={pos}
                      type="button"
                      className={`create-modal__pos-btn ${position === pos ? "create-modal__pos-btn--active" : ""}`}
                      onClick={() => handlePositionChange(pos)}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="create-modal__suggest-btn"
                onClick={handleSuggestPosition}
              >
                ✦ Suggest position based on stats
                {suggestedPos && (
                  <span className="create-modal__suggested-badge">{suggestedPos}</span>
                )}
              </button>

              {!isGK && (
                <div className="create-modal__field create-modal__field--compact">
                  <label className="create-modal__label">
                    Secondary positions{" "}
                    <span className="create-modal__label-hint">(up to 3)</span>
                  </label>
                  <div className="create-modal__positions-grid">
                    {POSITIONS.filter(p => p !== position && p !== "GK").map(pos => (
                      <button
                        key={pos}
                        type="button"
                        className={`create-modal__pos-btn ${secondaryPositions.includes(pos) ? "create-modal__pos-btn--active" : ""}`}
                        onClick={() => toggleSecondary(pos)}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── STEP 3: PREVIEW ── */}
          {step === "preview" && (
            <div className="create-modal__step create-modal__step--preview">
              <div className="create-modal__preview-card">
                <PlayerCard player={previewPlayer} />
              </div>
              <div className="create-modal__preview-info">
                <p className="create-modal__preview-name">{previewPlayer.name}</p>
                <p className="create-modal__preview-meta">
                  {previewPlayer.position} · {previewPlayer.nationality} · {previewPlayer.height}cm
                </p>
                <p className="create-modal__preview-overall">
                  {previewPlayer.overall} OVR
                </p>
                {previewPlayer.isLegend && (
                  <p className="create-modal__preview-legend">✦ Legend card</p>
                )}
                {previewPlayer.secondaryPositions && previewPlayer.secondaryPositions.length > 0 && (
                  <p className="create-modal__preview-secondary">
                    Also plays: {previewPlayer.secondaryPositions.join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="create-modal__footer">
          {step !== "info" && (
            <button
              type="button"
              className="create-modal__footer-btn create-modal__footer-btn--back"
              onClick={goBack}
            >
              ← Back
            </button>
          )}
          <div className="create-modal__footer-spacer" />
          {step !== "preview" ? (
            <button
              type="button"
              className="create-modal__footer-btn create-modal__footer-btn--next"
              onClick={goNext}
              disabled={!canProceed()}
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              className="create-modal__footer-btn create-modal__footer-btn--save"
              onClick={handleSave}
            >
              ✦ Add to collection
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
