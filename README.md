<div align="center">
  <img src="./public/images/logo.webp" width="200" alt="Ballers Logo" />
</div>

# ⚽ Ballers • Interactive Football Experience

> **[NEW] Draft Mode** — Build a squad through randomized formation and player picks, then survive a four-round knockout campaign. **World Cup player cards** are also available as special card variants in packs.

<p align="center">
  A browser-based football game combining **squad building**, **dynamic pack opening**, and a **custom-built interactive match engine** where you control every moment.
</p>

<p align="center">
  <a href="https://ballers-game.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/🚀%20Live%20Demo-ballers--game.vercel.app-brightgreen?style=for-the-badge" alt="Live Demo" />
  </a>
  <a href="https://github.com/kiellzz/ballers-game/actions/workflows/match-engine.yml" target="_blank">
    <img src="https://github.com/kiellzz/ballers-game/actions/workflows/match-engine.yml/badge.svg" alt="Match Engine Tests" />
  </a>
</p>

---

## 🎯 Quick Start

> **[▶ Play now at ballers-game.vercel.app](https://ballers-game.vercel.app/)** — No installation, plays directly in the browser.

**Local Development:**
```bash
git clone https://github.com/kiellzz/ballers-game.git
cd ballers-game
npm install
npm run dev
```

---

## 🌟 Core Features

### 🎴 Pack Opening System
- **Tier-based cards** (Legend, Gold, Silver, Bronze)
- **Special World Cup cards** available as packable card variants
- **Weighted probability** algorithms
- Animated reveals with visual feedback

### 👥 Squad Building & Lineup
- **Multiple formations** with drag & drop positioning
- **Bench system** with 5 substitutes
- **Random Fill button** to auto-populate the squad respecting positions
- **Favorites system** for quick player access
- **Real-time validation** of player positions

### Draft Mode
- **Three randomized formation choices** at the start of each draft
- **Position-locked player picks** with four drawn options per empty slot
- **Weighted player draw logic** that makes top-tier pulls rarer
- **Full XI + 5-player bench** assembled before entering matches
- **Four-round knockout campaign**: Round of 16, Quarterfinal, Semifinal, Final
- **Draft opponents scale by round strength**
- **Campaign tracking** for match results, MVP, top scorer, and top assister
- **Draft summary and champion screens** at the end of the campaign

### ✏️ Custom Player Creation
- Multi-step modal (Info → Stats → Preview)
- **Photo upload** with built-in crop tool and background removal
- **Position-weighted overall** calculation
- Custom players protected from removal if active

### 🆚 Pre-Match System
- **Opponent selection**
- Full squad reveal before match starts

### 🔄 In-Match Substitutions
- **Up to 3 substitutions** per team during the match
- **Position-aware selection** (filters bench by replaced player's position)
- **Smart bench filtering**
- **Pending & completed tracking** for audit trail
- **Opponent AI subs** (starts from minute 46, ~45% chance, 8-min intervals)
- **Sent-off protection** (excluded players unavailable for swaps)

### ⚽ Interactive Match Engine
- **Player-driven decisions** (attack & defense each turn)
- **Duel-based gameplay** (attacker vs defender)
- **Zone-based progression** (midfield → final third → box)
- **Set pieces** (Penalty, Free Kick, Corner)
- **Full disciplinary system** (yellow/red cards, two yellows = red)
- **Persistent card tracking** for both teams
- **Sent-off players** removed from selection
- **Dynamic player ratings** impacted by every action

### 🏆 Post-Match System
- **Match summary** with goal scorers & assists
- **MVP selection** based on highest rating
- **Red cards** displayed in timeline
- **Penalty goals** tagged with **(P)**

### 📊 Player Rating System
- Starts at **6.0** for all players
- Micro-adjustments for every action
- **Duel-based** rating changes
- **Clean sheet bonus** (GK +1.0, DEF +0.6)
- **Discipline penalties** for cards and dismissals
- **Balanced** to avoid inflation

### 🎵 Audio & Immersion
- Music player with SFX
- Toggle controls
- Interactive feedback sounds

---

## 🚀 Recent Updates

* **Draft Mode** - Randomized squad building, locked formations, knockout rounds, campaign awards, and champion flow
* **Penalty Shootout Flow** - Drawn matches can be decided from the spot with dedicated shootout UI
* **World Cup Cards** - Special card variants available in packs
* 📊 **Random Fill Squad Button** - Auto-populate entire squad (pitch + bench) with random players respecting formations
* 🟥 **Full Disciplinary System** - Two yellows = red, GK protection (max one yellow), sent-off player tracking
* ⚖️ **Symmetric Foul Logic** - Mirrored situations use identical probabilities
* 🧤 **Big Chance Rebalance** - `rush_save` vs `wait` tradeoffs for goalkeeper one-on-ones
* 📉 **Discipline-Aware Ratings** - Cards and dismissals penalize player ratings
* ⚙️ **Randomized Match Clock** - 0–3 min/action (triangular), compressed late-game (85+)
* 🧪 **Calibration Test Suite** - Vitest + GitHub Actions on match-engine/

---

## 📸 Screenshots

### Home & Pack Opening
<div align="center">
  <img src="./media/home1.png" width="49%">
  <img src="./media/packopening.gif" width="49%">
</div>

### Squad Building & Lineup
<div align="center">
  <img src="./media/lineup.gif" width="49%">
  <img src="./media/lineup.png" width="49%">
</div>

### Custom Players & Player Management
<div align="center">
  <img src="./media/createplayer.png" width="32%">
  <img src="./media/createplayer2.png" width="32%">
  <img src="./media/createplayer3.png" width="32%">
</div>

### Filters & Player Selection
<div align="center">
  <img src="./media/filtermodal.png" width="49%">
  <img src="./media/playermodalLineup.png" width="49%">
</div>

### Pre-Match & Match
<div align="center">
  <img src="./media/prematch.png" width="49%">
  <img src="./media/match.png" width="49%">
</div>

### Substitution & Summary
<div align="center">
  <img src="./media/subsmodal.png" width="49%">
  <img src="./media/matchsummary.png" width="49%">
</div>

---

## 🔧 Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Framer_Motion-EF008F?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

---

## 🎮 Match Engine Overview

The **interactive match engine** is custom-built with:

- **Duel System**: Player vs player resolution using stats
- **Zone Progression**: Midfield → Final Third → Box → Big Chance
- **Event Resolver**: Success, fail, rebound, injury outcomes
- **Set Pieces**: Penalty, Free Kick (interactive + quick), Corner
- **Disciplinary Engine**: Foul resolution, card logic, dismissals
- **Player Selector**: Context-aware, excludes sent-off players
- **Player Rating**: Real-time micro-adjustments per action

**Gameplay Flow:**
1. Choose offensive or defensive action
2. System resolves duel (attacker stats vs defender stats)
3. Outcome determines progression (goal, turnover, set piece, card)
4. Next situation auto-generates
5. Match continues until 90 minutes

---

## 🚢 Deployment

Deployed on **Vercel** with automatic CI/CD.

```
Live: https://ballers-game.vercel.app/
```

---

## ⚙️ Available Formations

**🛡️ 4-Back:** 4-3-3 • 4-3-3 (2) • 4-3-3 (3) • 4-3-3 (4) • 4-4-2 • 4-4-2 (2) • 4-4-2 (3) • 4-2-4 • 4-1-2-1-2

**🛡️ 5-Back:** 5-3-2 • 5-3-2 (2) • 5-3-2 (3) • 5-2-3

**🛡️ 3-Back:** 3-4-3 • 3-5-2 • 3-5-2 (2) • 3-5-2 (3)

## 🗺 Roadmap

- [x] ⚔️ Interactive Match Engine
- [x] 🏆 Match Summary & MVP System
- [x] 📊 Player Rating System
- [x] 🟥 Cards System
- [x] 🚀 Deploy on Vercel
- [x] 🧪 Duel engine calibration test suite (Vitest + GitHub Actions)
- [x] ✏️ Custom Player Creation (crop, overall weights, squad protection)
- [x] 🔄 Substitution System
- [x] 📊 Player match stats
- [x] 🎮 Draft Mode

---

## 👨‍💻 Author

Developed by **Ezequiel Borges**

- GitHub: [github.com/kiellzz](https://github.com/kiellzz)
- LinkedIn: [linkedin.com/in/ezequielborgesdev](https://www.linkedin.com/in/ezequielborgesdev)

> Interactive systems design with gameplay architecture, focusing on logic, scalability, and user experience.
