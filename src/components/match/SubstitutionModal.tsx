import React, { useMemo, useState } from "react";
import type { MatchPlayer } from "../../match-engine/matchTypes";
import type { Player } from "../../types/PlayerTypes";
import { canPlayerPlayInPosition } from "../../utils/playerValidation";
import { getFlagUrl } from "../../utils/getFlagUrl";
import "./SubstitutionModal.css";

interface SubstitutionModalProps {
  isOpen: boolean;
  subsUsed: number;
  maxSubs: number;
  starters: MatchPlayer[];
  benchPlayers: (Player | null)[];
  substitutedOutIds: Set<number>;
  pendingInIds: Set<number>;
  sentOffIds: Set<number>;
  onSubstitute: (outPlayerId: number, inPlayerId: number) => {
    ok: boolean;
    error: string | null;
  };
  onClose: () => void;
}

export const SubstitutionModal: React.FC<SubstitutionModalProps> = ({
  isOpen,
  subsUsed,
  maxSubs,
  starters,
  benchPlayers,
  substitutedOutIds,
  pendingInIds,
  sentOffIds,
  onSubstitute,
  onClose,
}) => {
  const [selectedOutId, setSelectedOutId] = useState<number | null>(null);
  const [selectedInId, setSelectedInId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Which side was selected first — determines filtering direction
  const [selectionOrigin, setSelectionOrigin] = useState<"off" | "on" | null>(null);

  const availableBench = useMemo(
    () =>
      benchPlayers.filter((player): player is Player => {
        if (!player) return false;
        const playerId = Number(player.id);
        return !substitutedOutIds.has(playerId) && !sentOffIds.has(playerId);
      }),
    [benchPlayers, sentOffIds, substitutedOutIds]
  );

  // ── Derive filter position based on which side was picked first ──

  // When OFF was picked first: filter ON by the starter's slot position
  const selectedOutStarter = selectedOutId
    ? starters.find((p) => p.id === selectedOutId) ?? null
    : null;

  const slotPositionFromOff =
    selectedOutStarter?.lineupPosition ?? selectedOutStarter?.position ?? null;

  // When ON was picked first: filter OFF by the bench player's position
  const selectedInPlayer =
    selectedInId != null
      ? availableBench.find((p) => Number(p.id) === selectedInId) ?? null
      : null;

  // Active position filter label shown next to the section header.
  // When ON is selected first, show the bench player's primary position as a hint
  // (actual filtering uses canPlayerPlayInPosition which includes alternate positions).
  const offSectionPositionHint =
    selectionOrigin === "on" && selectedInPlayer ? selectedInPlayer.position : null;
  const onSectionPositionHint =
    selectionOrigin === "off" && slotPositionFromOff ? slotPositionFromOff : null;

  // ── Eligible / ineligible splits ────────────────────────────────

  // Bench eligibility — filtered by starter's position when OFF was chosen first
  const eligibleBench = useMemo(() => {
    if (selectionOrigin !== "off" || !slotPositionFromOff) return availableBench;
    return availableBench.filter((p) =>
      canPlayerPlayInPosition(
        p,
        slotPositionFromOff as import("../../types/PlayerTypes").Position
      )
    );
  }, [availableBench, selectionOrigin, slotPositionFromOff]);

  const ineligibleBench = useMemo(() => {
    if (selectionOrigin !== "off" || !slotPositionFromOff) return [];
    return availableBench.filter(
      (p) =>
        !canPlayerPlayInPosition(
          p,
          slotPositionFromOff as import("../../types/PlayerTypes").Position
        )
    );
  }, [availableBench, selectionOrigin, slotPositionFromOff]);

  // Starters eligibility — filtered by bench player's position when ON was chosen first.
  // Correct question: "can the selected bench player fill this starter's slot?"
  // i.e. canPlayerPlayInPosition(benchPlayer, starter.lineupPosition)
  const eligibleStarters = useMemo(() => {
    if (selectionOrigin !== "on" || !selectedInPlayer) return starters;
    return starters.filter((p) => {
      const slotPos = (p.lineupPosition ?? p.position) as import("../../types/PlayerTypes").Position;
      return canPlayerPlayInPosition(selectedInPlayer, slotPos);
    });
  }, [starters, selectionOrigin, selectedInPlayer]);

  const ineligibleStarters = useMemo(() => {
    if (selectionOrigin !== "on" || !selectedInPlayer) return [];
    return starters.filter((p) => {
      const slotPos = (p.lineupPosition ?? p.position) as import("../../types/PlayerTypes").Position;
      return !canPlayerPlayInPosition(selectedInPlayer, slotPos);
    });
  }, [starters, selectionOrigin, selectedInPlayer]);

  // ── Cross-validation: the selected pair must be mutually eligible ─
  // In both directions the real question is the same:
  // "can the bench player fill the starter's slot position?"
  const isPairValid =
    selectedOutId !== null &&
    selectedInId !== null &&
    selectedOutStarter !== null &&
    selectedInPlayer !== null &&
    canPlayerPlayInPosition(
      selectedInPlayer,
      (slotPositionFromOff ?? "") as import("../../types/PlayerTypes").Position
    );

  if (!isOpen) return null;

  const subsLeft = maxSubs - subsUsed;
  const noSubsLeft = subsLeft <= 0;
  const canConfirm = isPairValid && !noSubsLeft;

  // ── Handlers ─────────────────────────────────────────────────────

  function resetSelections() {
    setSelectedOutId(null);
    setSelectedInId(null);
    setErrorMessage(null);
    setSelectionOrigin(null);
  }

  function handleSelectOut(playerId: number) {
    setErrorMessage(null);

    // If ON was chosen first and we're now picking OFF, just set it
    if (selectionOrigin === "on") {
      setSelectedOutId(selectedOutId === playerId ? null : playerId);
      if (selectedOutId === playerId) {
        // deselected → keep ON selected, origin stays "on"
      }
      return;
    }

    // OFF selected first (or nothing selected yet)
    if (selectedOutId === playerId) {
      // Deselect → full reset
      resetSelections();
      return;
    }

    // Switching OUT player → clear IN selection
    setSelectedInId(null);
    setSelectedOutId(playerId);
    setSelectionOrigin("off");
  }

  function handleSelectIn(playerId: number) {
    setErrorMessage(null);

    // If OFF was chosen first and we're now picking ON, just set it
    if (selectionOrigin === "off") {
      setSelectedInId(selectedInId === playerId ? null : playerId);
      return;
    }

    // ON selected first (or nothing selected yet)
    if (selectedInId === playerId) {
      // Deselect → full reset
      resetSelections();
      return;
    }

    // Switching IN player → clear OUT selection
    setSelectedOutId(null);
    setSelectedInId(playerId);
    setSelectionOrigin("on");
  }

  function handleConfirm() {
    if (!canConfirm || selectedOutId === null || selectedInId === null) return;

    const result = onSubstitute(selectedOutId, selectedInId);

    if (!result.ok) {
      setErrorMessage(result.error ?? "Unable to complete the substitution.");
      return;
    }

    resetSelections();
    onClose();
  }

  function handleClose() {
    resetSelections();
    onClose();
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="sub-modal-overlay" onClick={handleClose}>
      <div className="sub-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sub-modal__header">
          <h2 className="sub-modal__title">Substitution</h2>
          <div className="sub-modal__subs-left">
            <span className={`sub-modal__subs-pip ${subsLeft > 0 ? "sub-modal__subs-pip--used" : ""}`} />
            <span className={`sub-modal__subs-pip ${subsLeft > 1 ? "sub-modal__subs-pip--used" : ""}`} />
            <span className={`sub-modal__subs-pip ${subsLeft > 2 ? "sub-modal__subs-pip--used" : ""}`} />
            <span className="sub-modal__subs-label">
              {subsLeft} sub{subsLeft !== 1 ? "s" : ""} left
            </span>
          </div>
          <button className="sub-modal__close" onClick={handleClose}>×</button>
        </div>

        {/* Body */}
        {noSubsLeft ? (
          <div className="sub-modal__no-subs">No substitutions remaining.</div>
        ) : availableBench.length === 0 ? (
          <div className="sub-modal__no-subs">No bench players available.</div>
        ) : (
          <div className="sub-modal__body">

            {/* ── WHO COMES OFF ── */}
            <div className="sub-modal__section">
              <p className="sub-modal__section-label">
                Who comes OFF
                {offSectionPositionHint ? (
                  <span className="sub-modal__pos-filter"> · {offSectionPositionHint}</span>
                ) : null}
              </p>
              <div className="sub-modal__list">
                {eligibleStarters.map((player) => {
                  const isSentOff = sentOffIds.has(player.id);
                  const isQueuedOut = substitutedOutIds.has(player.id);
                  const isPendingIn = pendingInIds.has(player.id);
                  const isDisabled = isSentOff || isQueuedOut || isPendingIn;

                  return (
                    <button
                      key={player.id}
                      className={`sub-modal__player-row ${
                        selectedOutId === player.id ? "sub-modal__player-row--selected" : ""
                      } ${isDisabled ? "sub-modal__player-row--blocked" : ""}`}
                      onClick={() => handleSelectOut(player.id)}
                      disabled={isDisabled}
                      title={
                        isSentOff
                          ? "Sent-off players cannot be substituted."
                          : isQueuedOut
                          ? "This player is already queued to leave on the next situation."
                          : isPendingIn
                          ? "A queued substitute cannot leave before the next situation."
                          : undefined
                      }
                    >
                      <span className="sub-modal__player-pos">
                        {player.lineupPosition ?? player.position}
                      </span>
                      <span className="sub-modal__player-name">{player.name}</span>
                      {isSentOff && (
                        <span className="sub-modal__status-tag sub-modal__status-tag--danger">OFF</span>
                      )}
                      {isQueuedOut && (
                        <span className="sub-modal__status-tag">Queued out</span>
                      )}
                      {isPendingIn && (
                        <span className="sub-modal__status-tag">Queued</span>
                      )}
                      <img
                        src={getFlagUrl(player.nationality)}
                        alt={player.nationality}
                        className="sub-modal__player-flag"
                      />
                      <span className="sub-modal__player-ovr">{player.overall}</span>
                    </button>
                  );
                })}

                {/* Ineligible starters (shown dimmed when ON was picked first) */}
                {ineligibleStarters.map((player) => {
                  const isSentOff = sentOffIds.has(player.id);
                  const isQueuedOut = substitutedOutIds.has(player.id);
                  const isPendingIn = pendingInIds.has(player.id);

                  return (
                    <button
                      key={player.id}
                      className="sub-modal__player-row sub-modal__player-row--ineligible"
                      disabled
                      title={`Cannot be replaced by ${selectedInPlayer?.name ?? "this player"}`}
                    >
                      <span className="sub-modal__player-pos">
                        {player.lineupPosition ?? player.position}
                      </span>
                      <span className="sub-modal__player-name">{player.name}</span>
                      {isSentOff && (
                        <span className="sub-modal__status-tag sub-modal__status-tag--danger">OFF</span>
                      )}
                      {isQueuedOut && (
                        <span className="sub-modal__status-tag">Queued out</span>
                      )}
                      {isPendingIn && (
                        <span className="sub-modal__status-tag">Queued</span>
                      )}
                      <img
                        src={getFlagUrl(player.nationality)}
                        alt={player.nationality}
                        className="sub-modal__player-flag"
                      />
                      <span className="sub-modal__player-ovr">{player.overall}</span>
                      <span className="sub-modal__ineligible-tag">×</span>
                    </button>
                  );
                })}

                {selectionOrigin === "on" && eligibleStarters.length === 0 ? (
                  <p className="sub-modal__no-eligible">
                    No eligible positions for {selectedInPlayer?.name ?? "this player"}
                  </p>
                ) : null}
              </div>
            </div>

            {/* ── WHO COMES ON ── */}
            <div className="sub-modal__section">
              <p className="sub-modal__section-label">
                Who comes ON
                {onSectionPositionHint ? (
                  <span className="sub-modal__pos-filter"> · {onSectionPositionHint}</span>
                ) : null}
              </p>
              <div className="sub-modal__list">
                {eligibleBench.map((player) => (
                  <button
                    key={player.id}
                    className={`sub-modal__player-row ${
                      selectedInId === Number(player.id) ? "sub-modal__player-row--selected" : ""
                    }`}
                    onClick={() => handleSelectIn(Number(player.id))}
                  >
                    <span className="sub-modal__player-pos">{player.position}</span>
                    <span className="sub-modal__player-name">{player.name}</span>
                    <img
                      src={getFlagUrl(player.nationality)}
                      alt={player.nationality}
                      className="sub-modal__player-flag"
                    />
                    <span className="sub-modal__player-ovr">{player.overall}</span>
                  </button>
                ))}

                {ineligibleBench.map((player) => (
                  <button
                    key={player.id}
                    className="sub-modal__player-row sub-modal__player-row--ineligible"
                    disabled
                    title={`Cannot play ${slotPositionFromOff}`}
                  >
                    <span className="sub-modal__player-pos">{player.position}</span>
                    <span className="sub-modal__player-name">{player.name}</span>
                    <img
                      src={getFlagUrl(player.nationality)}
                      alt={player.nationality}
                      className="sub-modal__player-flag"
                    />
                    <span className="sub-modal__player-ovr">{player.overall}</span>
                    <span className="sub-modal__ineligible-tag">×</span>
                  </button>
                ))}

                {selectionOrigin === "off" && eligibleBench.length === 0 ? (
                  <p className="sub-modal__no-eligible">
                    No eligible players for {slotPositionFromOff}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        {selectedOutStarter && selectedInPlayer && isPairValid ? (
          <div className="sub-modal__preview">
            <span className="sub-modal__preview-out">▼ {selectedOutStarter.name}</span>
            <span className="sub-modal__preview-arrow">⇄</span>
            <span className="sub-modal__preview-in">▲ {selectedInPlayer.name}</span>
          </div>
        ) : null}

        {errorMessage ? <p className="sub-modal__error">{errorMessage}</p> : null}

        {/* Footer */}
        <div className="sub-modal__footer">
          <button className="sub-modal__btn sub-modal__btn--cancel" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="sub-modal__btn sub-modal__btn--confirm"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            Confirm Sub
          </button>
        </div>
      </div>
    </div>
  );
};
