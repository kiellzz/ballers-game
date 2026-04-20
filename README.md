<div align="center">

> ⚠️ **Project Status:** In development (Match engine to be added soon)
# ⚽ Ballers Game • Interactive Football Experience

</div>

<p align="center">
  <img src="https://img.shields.io/badge/Status-In%20Development-F2A65A?style=for-the-badge" alt="Project Status" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
</p>

<div align="center">

Ballers is a web-based football application focused on **interaction, squad building, and gameplay systems**, heavily inspired by modern football games like EA FC/FIFA Ultimate Team. Combining high-quality UI/UX with a growing custom match engine, Ballers aims to deliver an immersive browser experience.

[Features](#-features) • [Preview](#-preview) • [Running Locally](#%EF%B8%8F-running-locally) • [Roadmap](#-roadmap)

</div>

---

## 🎯 Project Goal

* Simulate a engaging football squad-building experience.
* Practice advanced frontend architecture with **React + TypeScript**.
* Implement state-driven UI/UX concepts inspired by real AAA sports titles.
* Build a robust foundation for a **custom interactive match engine**.

---

## 📸 Preview

### 🏠 Home & Navigation
<div align="center">
  <img src="./media/home1.png" width="49%" alt="Home Screen">
  <img src="./media/home2.png" width="49%" alt="Home Navigation">
</div>

### 🎴 Pack Opening & Filters
<div align="center">
  <img src="./media/packopening.gif" width="49%" alt="Pack Opening Animation">
  <img src="./media/filtermodal.png" width="49%" alt="Search Filters">
</div>

### 👥 Squad & Lineup System
<div align="center">
  <img src="./media/lineup.gif" width="49%" alt="Lineup Drag and Drop">
  <img src="./media/lineup.png" width="49%" alt="Static Lineup View">
</div>

### 🎯 Player Interaction
<div align="center">
  <img src="./media/playermodal.png" width="49%" alt="Player Details">
  <img src="./media/playermodalLineup.png" width="49%" alt="Lineup Player Options">
</div>

### 🆚 Pre-Match
<div align="center">
  <img src="./media/prematch.png" width="49%" alt="Pre-Match Opponent Selection">
  <img src="./media/prematch_opplineup.png" width="49%" alt="Opponent Squad Reveal">
</div>

---

## 🛠 Architecture

* **Component-based structure:** Highly reusable UI elements (player cards, modals).
* **Custom Hooks:** Clean separation of business logic from the presentation layer.
* **Utility-driven systems:** Dedicated modules for formations, pack probability weights, and validation.

---

## 🚀 Features

* 🎴 **Dynamic Pack Opening System**
    * Tier-based cards (Legend, Gold, Silver, Bronze).
    * Weighted probability algorithms for realistic drop rates.
    * Engaging, animated card reveals.
* 👥 **Advanced Squad Building**
    * Multiple tactical formations.
    * Drag & drop player positioning.
    * Full bench and substitution management.
* 🎯 **Deep Player Interaction**
    * Detailed stat modals for every player.
    * Quick-swap and remove mechanics.
    * Favorites system.
* 🔎 **Robust Filtering**
    * Filter database by overall rating, tier, position, and nationality.
    * Dynamic, real-time search.
* 🆚 **Pre-Match Preparation**
    * Opponent selection flow.
    * Predefined challenger teams.
* 🔊 **Audio & Immersion**
    * 🎵 **Integrated Music Player:** Curated soundtrack for a complete game atmosphere.
    * 🔉 **Dynamic SFX:** Sound effects for pack openings, clicks, and transitions.
    * ⚡ **Tactile Feedback:** Audio-visual synchronization for UI interactions.
    * 🔘 **User Control:** Audio and music can be toggled on/off at any time via the **top-left controls**.

---

## ⚙️ Running Locally

Want to test your pack luck on your own machine? Follow these steps:

**1. Clone the repository**
```bash
git clone [https://github.com/kiellzz/ballers-next.git](https://github.com/kiellzz/ballers-game.git)
cd ballers-game
```

**2. Install dependencies**
```bash
npm install
```

**3. Fire it up**
```bash
npm run dev
```
> 📍 App will be running at: `http://localhost:5173`

---

## 🗺 Roadmap

The journey doesn't stop here. Here is what is planned for future updates:

- [ ] ⚔️ **Interactive Match Engine:** Move beyond squad building into actual simulated gameplay.
- [ ] 🎲 **Stat-Driven Outcomes:** Player attributes (SPD, SHO, PHY) directly impacting match results.
- [ ] 🎮 **Draft Mode:** Build a team on the fly from random selections.

---

## 👨‍💻 Author

Developed by **Ezequiel Borges**

* **GitHub:** [@kiellzz](https://github.com/kiellzz)
* **LinkedIn:** [Ezequiel Borges](https://www.linkedin.com/in/ezequielborgesdev)

> *This project represents a transition from building standard web applications to engineering interactive systems with real gameplay structure, focusing heavily on robust technical architecture and polished user experience.*
