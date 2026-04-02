# Read Later

Personal read-later library: save articles and video links, read in a distraction-free view, **like** items, **notes** per article, **folders**, tags, highlights, a **side drawer** (Home, Liked, Archive, Videos, Notes, Tags), and a PWA for offline access to cached pages.

## Stack

- **Next.js 15** (App Router), TypeScript, Tailwind CSS
- **Prisma** + **SQLite** (default `DATABASE_URL`; switch to PostgreSQL for production)
- **NextAuth.js** (credentials)
- **Mozilla Readability** + **jsdom** for article extraction
- **Service worker** (`public/sw.js`) caches same-origin GET responses in production for basic offline revisits
- **Chrome extension** (`extension/`) calling `/api/save` with a bearer token

## Setup

### Windows (recommended if `npm` fails in PowerShell)

1. Install [Node.js](https://nodejs.org/) LTS and enable **Add to PATH** in the installer.
2. In File Explorer, open the **`read-later`** folder (inside this project).
3. **Double-click `run-dev.bat`**. It will:
   - Put Node on `PATH` for that window (fixes “npm is not recognized”)
   - Run `npm install` if needed
   - Create/fix `.env` and `AUTH_SECRET`
   - Run `prisma generate` and **`prisma db push`** (updates `prisma/dev.db` without relying on `npx` in your IDE terminal)
   - Start the app at [http://localhost:3000](http://localhost:3000)

Optional: **`setup-database.bat`** only syncs the database (after `node_modules` exists).

### macOS / Linux / terminal with working `npm`

```bash
cd read-later
cp .env.example .env   # then set AUTH_SECRET, or run: node scripts/ensure-auth-secret.cjs
npm install
npx prisma generate
npx prisma db push     # or: npx prisma migrate deploy
npm run dev
```

After pulling updates, run **`npx prisma db push`** (or `migrate deploy`) again so the SQLite file matches the schema.

Then open [http://localhost:3000](http://localhost:3000), register, and use **Add** to paste URLs.

**Note:** This project pins **Prisma 6.x**. Do not upgrade to Prisma 7 without following their new config (it removes `url` from `schema.prisma`).

### “localhost:3000 doesn’t load” or `npm` not recognized (Windows)

1. **Install Node.js LTS** from [https://nodejs.org/](https://nodejs.org/) (includes `npm`). During setup, enable **“Add to PATH”**.
2. **Close and reopen** your terminal (or restart Cursor) so PATH updates.
3. **Run the app from the `read-later` folder**, not the parent folder:
   - `cd read-later` then `npm install` then `npx prisma migrate deploy` then `npm run dev`
   - Or double‑click **`run-dev.bat`** inside `read-later` (it uses `C:\Program Files\nodejs\npm.cmd` if `npm` isn’t on PATH).
4. From the **parent** folder you can also run `npm run install:app` then `npm run dev` if `npm` works in PATH.

Until `npm run dev` prints something like `Ready on http://localhost:3000`, the browser has nothing to connect to.

If you see **`'next' is not recognized`**, delete the `read-later/node_modules` folder, run `npm install` again inside `read-later`, then `npm run dev`. Projects on **OneDrive** sometimes break `node_modules` symlinks—moving the folder to a non-synced path (e.g. `C:\dev\read-later`) avoids that.

## Browser extension

1. In the app, go to **Settings** → generate an **API token**.
2. In Chrome/Edge: **Extensions** → **Developer mode** → **Load unpacked** → select the `extension` folder.
3. Open the extension popup: set **App URL** (e.g. `http://localhost:3000`), paste the token, click **Save connection**. After that, the popup only shows **Save this tab**; use **Connection settings** when you need to change URL or token.

## Production notes

- Use a hosted **PostgreSQL** database and set `DATABASE_URL`.
- Set `NEXTAUTH_URL` to your public origin and a strong `AUTH_SECRET`.
- Build: `npm run build` then `npm start`.
- Many sites block server-side fetching; extraction may fail—users can still open the original link.

### Docker (SQLite on a volume)

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose v2).
2. In the `read-later` folder, create a `.env` file (or export vars) with at least:
   - `AUTH_SECRET` — long random string (e.g. `openssl rand -base64 32`)
   - `NEXTAUTH_URL` — how users reach the app (e.g. `http://localhost:3000` or `https://yourdomain.com`)
3. Run:

```bash
docker compose up --build -d
```

The app listens on port **3000**; the database file is stored in the `read-later-data` Docker volume at `/data/prod.db` inside the container. For a public server, put a reverse proxy (Caddy, nginx, Traefik) in front with TLS and set `NEXTAUTH_URL` to that HTTPS URL.

## License

MIT
