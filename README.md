# PDP Tracker

Control de lecturas de mamografías — Dr. Espinosa

## Stack
- **Frontend**: Next.js 14 (App Router)
- **Base de datos**: Supabase (PostgreSQL)
- **Hosting**: Vercel

## Despliegue paso a paso

### 1. Supabase

1. Entra en [supabase.com](https://supabase.com) → **New Project**
2. Nombre: `pdp-tracker`, elige región (eu-west)
3. Ve a **SQL Editor** → New Query
4. Copia y pega todo el contenido de `supabase-schema.sql` → Run
5. Ve a **Settings → API** y copia:
   - `Project URL` → será tu `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → será tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. GitHub

```bash
cd pdp-tracker
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/pdp-tracker.git
git push -u origin main
```

### 3. Vercel

1. Entra en [vercel.com](https://vercel.com) → **Add New Project**
2. Importa el repo `pdp-tracker` de GitHub
3. En **Environment Variables** añade:
   - `NEXT_PUBLIC_SUPABASE_URL` = tu Project URL de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu anon key de Supabase
4. Click **Deploy**

### 4. Local (desarrollo)

```bash
cp .env.local.example .env.local
# Rellena con tus datos de Supabase
npm install
npm run dev
```

## Estructura

```
pdp-tracker/
├── app/
│   ├── globals.css
│   ├── layout.js
│   └── page.js          ← componente principal
├── lib/
│   └── supabase.js       ← cliente Supabase
├── supabase-schema.sql   ← SQL para crear tablas + datos iniciales
├── .env.local.example
├── next.config.js
└── package.json
```
