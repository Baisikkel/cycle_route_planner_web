# Technical Architecture & PWA Implementation Plan

This document outlines the core technology stack and the strategy for implementing the mobile Progressive Web App (PWA).

## 1. Confirmed Technology Stack
* **Frontend:** React + Vite + TypeScript.
* **Styling:** Tailwind CSS (Mobile-first approach, optimized bundle size).
* **Map Engine:** MapLibre GL JS.
* **Routing Engine:** Valhalla (Self-hosted via Docker).
* **Geocoding:** Digitransit (Pelias).
* **Data Source:** OpenStreetMap (OSM) via Geofabrik.

## 2. PWA Implementation Strategy 🚨
To meet the mobile-first requirement, we are implementing the following:
* **Tooling:** `vite-plugin-pwa` for automated Service Worker and manifest management.
* **Service Worker:** Implements caching strategies (Stale-While-Revalidate) to ensure fast loading and offline reliability.
* **Installability:** A `manifest.webmanifest` file will be included to allow "Add to Home Screen" functionality on iOS and Android.
* **Geolocation:** Standard Geolocation API usage with native browser permission handling.

## 3. Infrastructure & Deployment
* **Development/Prototyping:** Vercel/Netlify for instant previews.
* **Production:** TalTech server infrastructure using Docker containers.

## 4. Next Steps & Approval
This document serves as the technical baseline for development. 
**Action required:** Team members and mentors (Lukas, Raivo) please review and approve the proposed stack.
