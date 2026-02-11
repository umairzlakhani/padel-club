# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Match Day** — Premium, invite-only Padel matchmaking app for Karachi. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS 4.

## Business Context

- **Model**: Subscription — 1,000 PKR/month, targeting 1,000 members
- **Access**: Invite-only; new members join via existing member referrals
- **Core feature**: Skill-based matchmaking for Padel players in Karachi

## Design System — "Luxury Dark"

- **Background**: Deep charcoal (`#1A1A2E`, `#16213E`)
- **Accent**: Electric green (`#00FF87`, `#00E676`)
- **Typography**: Clean, modern sans-serif; generous whitespace
- **Tone**: Exclusive, minimal, premium — avoid busy layouts or bright backgrounds
- All UI should reinforce the invite-only, members-club identity

## Commands

- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint (flat config, v9)

No test framework is currently configured.

## Architecture

- **Next.js App Router** with file-based routing under `app/`
- **Server Components** by default (React 19); add `'use client'` directive only when needed
- **Tailwind CSS v4** via PostCSS plugin (`@tailwindcss/postcss`)
- **TypeScript strict mode** enabled
- **Path alias**: `@/*` maps to the project root

## Key Config

- `tsconfig.json` — ES2017 target, bundler module resolution, strict mode
- `eslint.config.mjs` — ESLint 9 flat config with Next.js Core Web Vitals and TypeScript rules
- `next.config.ts` — Minimal config, ready for customization
- `postcss.config.mjs` — Tailwind CSS 4 PostCSS plugin
