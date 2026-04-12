# Solve - Clans | Bot Discord Ticket + Panel Web

## Vue d'ensemble

Bot Discord de gestion de tickets pour les clans d'un serveur NarutoRP. Le bot affiche un embed avec un select menu dans un salon Discord. Les joueurs choisissent leur clan, remplissent une modale (Nom + Prénom RP), et un ticket est créé dans la catégorie Discord correspondante.

Le tout est géré depuis un panel web avec authentification Discord OAuth2.

## Stack technique

### Bot Discord
- **Runtime**: Node.js + TypeScript
- **Librairie**: discord.js v14
- **Base de données**: Supabase (PostgreSQL)
- **Hébergement**: VPS (Docker)

### Panel Web
- **Frontend**: React 19 + Vite + TypeScript
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (Auth Discord OAuth + Edge Functions + PostgreSQL)
- **Auth**: Discord OAuth2 via Supabase Auth (provider discord)

## Architecture du projet

```
solve-clans/
├── bot/                          # Bot Discord TypeScript
│   ├── src/
│   │   ├── index.ts              # Entry point, client init
│   │   ├── config.ts             # Env vars, constants
│   │   ├── supabase.ts           # Supabase client (service_role)
│   │   ├── commands/
│   │   │   └── setup.ts          # /setup-clans - Envoie l'embed + select dans le salon
│   │   ├── events/
│   │   │   ├── ready.ts
│   │   │   └── interactionCreate.ts
│   │   ├── handlers/
│   │   │   ├── selectMenu.ts     # Gère la sélection du clan dans le select
│   │   │   ├── modal.ts          # Gère la soumission de la modale Nom/Prénom
│   │   │   └── ticketActions.ts  # Boutons dans le ticket (fermer, supprimer)
│   │   ├── services/
│   │   │   ├── ticketService.ts  # Logique de création/gestion de tickets
│   │   │   └── embedBuilder.ts   # Construction des embeds
│   │   └── utils/
│   │       └── helpers.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── web/                          # Panel Web React
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx               # Router principal
│   │   ├── lib/
│   │   │   └── supabase.ts       # Client Supabase (anon key)
│   │   ├── hooks/
│   │   │   ├── useAuth.ts        # Hook auth Discord OAuth
│   │   │   └── useOptions.ts     # CRUD options de clans
│   │   ├── pages/
│   │   │   ├── Login.tsx         # Page de connexion Discord OAuth
│   │   │   ├── Dashboard.tsx     # Vue d'ensemble
│   │   │   ├── Options.tsx       # Gestion des options du select menu
│   │   │   ├── Settings.tsx      # Config (guild ID, salon, embed, bannière)
│   │   │   └── Callback.tsx      # OAuth callback
│   │   ├── components/
│   │   │   ├── Layout.tsx        # Layout glassmorphism avec sidebar
│   │   │   ├── OptionCard.tsx    # Carte d'une option de clan
│   │   │   ├── OptionForm.tsx    # Formulaire création/édition option
│   │   │   ├── EmbedPreview.tsx  # Preview live de l'embed Discord
│   │   │   └── ProtectedRoute.tsx
│   │   └── styles/
│   │       └── index.css         # Tailwind + custom glassmorphism
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── supabase-client.ts
│   │   │   ├── cors.ts
│   │   │   └── auth.ts           # Vérif auth + rôle admin
│   │   ├── clan-options/         # CRUD options de clans
│   │   │   └── index.ts
│   │   ├── bot-config/           # Config du bot (guild, channel, embed)
│   │   │   └── index.ts
│   │   └── api-docs/
│   │       └── index.ts
│   └── config.toml
│
├── docker-compose.yml            # Bot + éventuellement le web en prod
├── .env.example
└── README.md
```

## Schéma base de données (Supabase)

```sql
-- Table des administrateurs autorisés
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT NOT NULL UNIQUE,
  discord_username TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Configuration du bot par guild
CREATE TABLE bot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL UNIQUE,
  channel_id TEXT,                    -- Salon où envoyer l'embed
  message_id TEXT,                    -- ID du message embed (pour update)
  embed_title TEXT DEFAULT 'Ouvrir un ticket clan',
  embed_color TEXT DEFAULT '#7C3AED', -- Couleur de l'embed (hex)
  banner_url TEXT,                    -- URL de la bannière
  log_channel_id TEXT,                -- Salon de logs (optionnel)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Options du select menu (les clans)
CREATE TABLE clan_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  label TEXT NOT NULL,                -- Nom affiché dans le select (ex: "Hyûga")
  emoji TEXT,                         -- Emoji affiché (ex: "👁" ou custom emoji ID)
  description TEXT,                   -- Description dans le select (optionnel)
  category_id TEXT NOT NULL,          -- ID de la catégorie Discord où créer le ticket
  staff_role_id TEXT,                 -- Rôle staff à mentionner dans le ticket (optionnel)
  sort_order INT DEFAULT 0,          -- Ordre d'affichage
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tickets ouverts (tracking)
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,    -- ID du channel ticket créé
  user_id TEXT NOT NULL,              -- Discord user ID
  clan_option_id UUID REFERENCES clan_options(id),
  rp_first_name TEXT NOT NULL,
  rp_last_name TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  closed_by TEXT                      -- Discord user ID qui a fermé
);

-- RLS policies
ALTER TABLE bot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Policies: accès uniquement via service_role (bot) ou via Edge Functions authentifiées
```

## Fonctionnement détaillé

### 1. Embed principal (dans Discord)

Le bot envoie un embed dans le salon configuré avec :

```
┌─────────────────────────────────────────┐
│ [BANNIÈRE: SolveClansBanner.png]        │
│                                         │
│ 🎫 Ouvrir un ticket clan               │
│                                         │
│ **Fonctionnement des tickets**          │
│                                         │
│ 1️⃣ Sélectionnez votre clan dans le     │
│    menu ci-dessous                      │
│ 2️⃣ Renseignez votre Nom et Prénom RP   │
│    dans la fenêtre prévue à cet effet   │
│                                         │
│ **Règles de courtoisie**                │
│                                         │
│ • Merci de rester poli et respectueux   │
│   (Bonjour, Merci...)                   │
│ • Toute forme de harcèlement est        │
│   interdite.                            │
│                                         │
│ **Sélection du ticket**                 │
│ ℹ️ Choisissez votre clan dans le menu   │
│    ci-dessous                           │
│                                         │
│ Footer: Solve · Clans | {date}          │
└─────────────────────────────────────────┘
[ 🔽 Choisissez votre clan...          ]  ← StringSelectMenu
```

### 2. Flow utilisateur

1. L'utilisateur sélectionne un clan dans le select menu
2. Une **modale** s'affiche avec deux champs :
   - `Prénom RP` (TextInput SHORT, required)
   - `Nom RP` (TextInput SHORT, required)
3. À la soumission de la modale :
   - Un channel est créé sous la catégorie Discord configurée pour ce clan
   - Le nom du channel : `{emoji}-{prenom}-{nom}` (slugifié, lowercase)
   - Permissions : l'utilisateur + les rôles staff configurés peuvent voir le channel
   - Un embed d'accueil est envoyé dans le ticket avec les infos (clan, nom RP, date)
   - Un bouton "🔒 Fermer le ticket" est ajouté
4. Quand un staff ferme le ticket :
   - Le channel est supprimé (ou archivé selon config)
   - Le ticket est marqué `closed` en base

### 3. Panel Web

#### Auth
- Connexion via Discord OAuth2 (Supabase Auth provider discord)
- Seuls les utilisateurs dont le `discord_id` est dans la table `admins` ont accès
- Vérification côté Edge Function ET côté client

#### Pages

**Dashboard**
- Nombre de tickets ouverts / fermés
- Derniers tickets

**Options (CRUD des clans)**
- Liste des options avec drag & drop pour réordonner
- Formulaire : label, emoji (picker ou input texte), description, catégorie Discord (dropdown des catégories du serveur), rôle staff
- Toggle enabled/disabled
- Preview live de comment ça rend dans le select

**Settings**
- Guild ID
- Salon cible pour l'embed
- Personnalisation de l'embed (titre, couleur, bannière URL)
- Bouton "Déployer l'embed" → appelle le bot pour envoyer/mettre à jour le message
- Salon de logs

### 4. Communication Bot ↔ Panel

Le bot poll Supabase en temps réel (Supabase Realtime subscriptions) pour détecter les changements de config et d'options. Quand la config change, le bot met à jour l'embed automatiquement.

Alternative : une Edge Function `bot-sync` que le panel appelle, qui insère un événement dans une table `bot_events`, et le bot écoute cette table en realtime.

## Commandes slash du bot

| Commande | Description |
|---|---|
| `/setup-clans` | Envoie l'embed + select dans le salon courant et sauvegarde le message_id |

## Variables d'environnement

```env
# Bot Discord
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Web
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_DISCORD_CLIENT_ID=
```

## Conventions de code

- Tout le code est en **TypeScript strict**
- Utiliser **ESM** (type: "module" dans package.json)
- Nommage des fichiers : **camelCase** pour les fichiers TS, **PascalCase** pour les composants React
- Edge Functions Supabase : utiliser le pattern `_shared/` pour les helpers communs (voir les projets existants de Rayane)
- Supabase Edge Functions : Deno runtime, imports depuis `https://esm.sh/`
- Gestion d'erreurs explicite, pas de `any` sauf nécessité absolue
- Composants React : functional components avec hooks uniquement

## Style du Panel Web

**Thème : Glassmorphism sombre épuré, inspiré Naruto/gaming**

- Background : dégradé sombre (#0a0a0f → #12121a) avec des formes subtiles violettes/indigo en arrière-plan (blobs flous)
- Cards : `backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl`
- Texte principal : blanc/gris clair
- Accents : violet (#7C3AED) et indigo (#6366F1)
- Sidebar : glassmorphism, icônes + labels, logo Solve en haut
- Inputs : fond transparent, bordure white/10, focus ring violet
- Boutons primaires : gradient violet → indigo
- Animations : transitions douces sur hover, fade-in sur les pages
- Font : Geist ou Satoshi (via Google Fonts ou CDN)

## Ordre de développement recommandé

1. **Setup Supabase** : migrations SQL, config auth Discord OAuth
2. **Bot Discord** : structure de base, connexion Supabase, commande `/setup-clans`
3. **Bot : Embed + Select** : construction de l'embed, envoi, gestion du select menu
4. **Bot : Modale + Création ticket** : modale Nom/Prénom, création du channel, embed d'accueil
5. **Bot : Fermeture ticket** : bouton fermer, suppression channel, update BDD
6. **Web : Auth** : login Discord OAuth, protection routes, vérif admin
7. **Web : Layout** : sidebar glassmorphism, routing
8. **Web : Page Options** : CRUD des options de clans, formulaire avec emoji picker
9. **Web : Page Settings** : config guild, salon, embed, bouton déployer
10. **Web : Dashboard** : stats tickets
11. **Bot : Realtime sync** : écouter les changements Supabase pour auto-update l'embed
12. **Docker** : Dockerfile bot, docker-compose pour déploiement

## Assets

- Bannière embed : `SolveClansBanner.png` (fournie, à héberger sur un CDN ou en attachment Discord)
- Le style de l'embed Discord doit reproduire le design du screenshot fourni (fond sombre, titres en gras, sections séparées, footer avec date)

## Maquette Figma

https://www.figma.com/design/8rfR15ZOIKUcPE14I0dO9o/Untitled?node-id=101-2&m=dev
https://www.figma.com/design/8rfR15ZOIKUcPE14I0dO9o/Untitled?node-id=101-174&m=dev
https://www.figma.com/design/8rfR15ZOIKUcPE14I0dO9o/Untitled?node-id=101-378&m=dev

## Notes importantes

- Le select menu Discord est limité à 25 options maximum
- Les custom emojis doivent être au format `<:name:id>` pour Discord
- Les noms de channels Discord sont limités à 100 caractères, lowercase, pas d'espaces (remplacer par des tirets)
- Penser à la gestion des erreurs : utilisateur qui a déjà un ticket ouvert, catégorie supprimée, permissions manquantes
- Le bot doit vérifier qu'il a les permissions nécessaires (Manage Channels, Send Messages, Embed Links) au démarrage