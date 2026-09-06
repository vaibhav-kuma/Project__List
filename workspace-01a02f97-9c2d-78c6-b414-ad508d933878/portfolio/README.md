# Vaibhav Kumar — Interactive Digital Engineering Lab

A production-quality portfolio for **Vaibhav Kumar** (Backend Developer · Cybersecurity Engineer · AI Builder), built as an interactive "digital engineering lab" rather than a conventional portfolio template.

## Stack

- **Next.js 15** (App Router, static export-friendly SSG) · **React 19** · **TypeScript (strict)**
- **Tailwind CSS 3** design system (dark command-center theme: cyan primary, violet secondary, emerald status)
- **Three.js + @react-three/fiber + @react-three/drei** — procedural 3D only (no GLTF downloads)
- **Framer Motion** UI transitions · **Lucide** icons · **Lenis** smooth scrolling

## Run

```bash
npm install
npm run dev     # development
npm run build   # production build
npm start       # serve production build
```

## Architecture

```
app/                      # routes: home + /projects/[slug] case studies, sitemap, robots
components/
  layout/                 # Navbar, Footer
  providers/              # MotionProvider (reduced motion), SmoothScrollProvider (Lenis)
  sections/               # Hero, About, Skills, Projects, Architecture, Activity, Experience, Contact
  three/
    primitives/           # ParticleField, DataStream, NodeRing
    visuals/              # DigitalCore, SecuritySphere, AITransformEngine, ThreatRadar,
                          # ThreatGlobe, MonitoringGrid  (one per featured project)
    scenes/               # HeroScene, UniverseScene (Canvas + camera rigs)
    HeroCanvas.tsx        # WebGL detection + dynamic import + CSS fallback
    UniverseCanvas.tsx    # same pattern for the project universe
  project/                # ProjectCard (2D), CaseStudy
  ui/                     # SectionHeader, Reveal, TechTag, TerminalCard, StatusPill
lib/
  types.ts                # strict data model
  data/                   # profile, featured-projects (case studies), repositories, skills, experience
  hooks/                  # use-prefers-reduced-motion, use-media-query, use-webgl-support
  github.ts               # client-side GitHub REST layer with graceful fallback
public/resume/            # resume PDF served at /resume/Vaibhav_Kumar_Resume.pdf
```

## Key behaviors

- **Featured project ranking** is configured in `lib/data/featured-projects.ts`
  (SOC Platform → LegacyLift AI → VADT → DarkExposure → Threat Detection Monitoring Dashboard).
  All case-study copy is derived from the actual repositories — no invented metrics.
- **3D is progressive**: scenes are dynamically imported with `ssr: false`, WebGL support is
  detected at runtime, and a CSS fallback renders when unavailable. The 2D project grid is
  always present (mobile, keyboard, screen readers, no-WebGL).
- **Reduced motion** is respected via `MotionConfig(reducedMotion="user")`, a
  `prefers-reduced-motion` hook that freezes 3D animation loops, and CSS overrides.
- **GitHub integration** fetches public REST data client-side (no credentials) and falls back
  to the curated snapshot in `lib/data/repositories.ts`.

## Configuration

- Site URL / canonical domain: `profile.siteUrl` in `lib/data/profile.ts`
- "Open to opportunities" pill: `profile.openToOpportunities`
- Resume file: replace `public/resume/Vaibhav_Kumar_Resume.pdf`
