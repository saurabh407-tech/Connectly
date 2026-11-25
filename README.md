# Nexora

A modern real-time chat application built with the MERN stack (JavaScript).

## Tech stack
- **Client:** React (Vite), Tailwind CSS, React Router DOM, Zustand, Axios, Lucide React, React Hot Toast
- **Server:** Node.js, Express, MongoDB (Mongoose), Socket.IO, JWT, bcryptjs, Helmet, express-rate-limit
- **Services:** Cloudinary (placeholder), Nodemailer (placeholder)

## Getting started

### 1. Server
```bash
cd server
npm install
cp .env.example .env   # already provided as .env for local dev; edit values
npm run dev
```
Check: http://localhost:5000/api/health

### 2. Client
```bash
cd client
npm install
cp .env.example .env
npm run dev
```
Open http://localhost:5173

> While the auth API is not implemented, set `VITE_DEV_BYPASS_AUTH=true` in `client/.env`
> to open `/dashboard` without logging in. Remove it once auth works.

## Docs
- [Project roadmap](docs/PROJECT-ROADMAP.md)
- [API structure](docs/API-STRUCTURE.md)
