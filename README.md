# BizOS

An offline-capable business and personal finance operating system, built for a live client (Dash & Co.) to manage business and personal finances in one place — designed to work reliably even with unstable connectivity.

🔗 **Live:** [bizos-six.vercel.app](https://bizos-six.vercel.app)

## The Problem

Small business owners often track business and personal finances informally, with tools that assume constant internet access. BizOS is built offline-first, so entries and calculations work locally and sync when connectivity returns.

## Features

- Unified tracking of business and personal finances
- Offline-first data entry with local-first state, synced to the backend when online
- Real-time-feeling UI backed by local state management

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, PostgreSQL |
| Frontend | Next.js 14 (PWA) |
| Offline sync | Dexie.js (IndexedDB wrapper) |
| State management | Zustand |

## Project Docs

Full specs for this project (`DESIGN.md`, backend/frontend build prompts) are included in the repo — this was specced end-to-end before implementation, following a spec-first Claude Code workflow.

## Status

Live and in use — this is a real-users project, not a portfolio-polish piece.

---
*Built with a spec-first workflow — full technical spec and phased build plan preceded implementation.*
