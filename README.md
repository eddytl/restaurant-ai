# Restaurant AI — Tchopetyamo

A full-stack AI-powered restaurant assistant for a Cameroonian restaurant. Customers can browse the menu, place orders, track order status, and chat with an AI agent. Administrators manage everything from a dedicated dashboard.

---

## Architecture

```
restaurant-ai/
├── api/          — Express.js REST API (port 3001) + MongoDB
├── mcp-server/   — MCP server (stdio) wrapping the API as AI tools
├── agent/        — Express.js AI agent (port 3000) — Claude + MCP client
├── chat-ui/      — Vue 3 customer chat interface (port 8080)
└── admin-ui/     — Vue 3 admin dashboard (port 8081)
```

### Request flow

```
Customer → Chat UI → Agent (Claude AI + MCP) → MCP Server → API → MongoDB
Admin    → Admin UI ──────────────────────────────────────→ API → MongoDB
```

---

## Services

| Service | Port | Description |
|---------|------|-------------|
| `api` | 3001 | REST API + MongoDB |
| `agent` | 3000 | AI agent (Claude via Anthropic SDK) |
| `chat-ui` | 8080 | Customer chat interface |
| `admin-ui` | 8081 | Admin dashboard |
| `mongodb` | 27017 | MongoDB database |

---

## Quick Start (Docker)

### Prerequisites

- Docker & Docker Compose
- An Anthropic API key

### 1 — Configure environment

```bash
# api/.env
MONGODB_URI=mongodb://mongodb:27017/tchopetyamo
PORT=3001
JWT_SECRET=your-secret-key

# agent/.env
ANTHROPIC_API_KEY=sk-ant-...
API_URL=http://api:3001
PORT=3000
```

### 2 — Start all services

```bash
docker compose up -d
```

### 3 — Seed the database

```bash
docker compose exec api node seed.js
```

### 4 — Access the apps

| App | URL |
|-----|-----|
| Chat UI | http://localhost:8080 |
| Admin UI | http://localhost:8081 |

**Default admin credentials:** `admin@restaurant.cm` / `admin123`

---

## Admin Dashboard

The admin UI (`/admin-ui`) is a full-featured management panel built with Vue 3, Tailwind CSS, and the Tchopetyamo brand colors.

### Features

- **Dashboard** — KPI cards (revenue, orders, customers, menu items), monthly bar chart, order status doughnut, daily line chart with 7/14/30-day range selector
- **Menu Management** — paginated card grid, image upload, category filtering, availability toggle, create/edit/delete
- **Orders** — paginated table, status filter tabs, one-click status progression, cancel flow
- **Customers** — server-side search, total spent, order history
- **Conversations** — full chat replay panel with markdown rendering, menu card images, and chat bubbles per message
- **Users** — role-based CRUD (admin only), create/edit/delete users
- **i18n** — French / English with live switching
- **Skeleton loading** — all tables and KPI cards show content-matching skeletons while loading
- **Dark mode** — fully supported across all views

### Tech stack

- Vue 3 (Composition API, `<script setup>`)
- Pinia (auth, theme, sidebar stores)
- Vue Router (lazy-loaded routes, `adminOnly` guard)
- vue-i18n 9
- Chart.js + vue-chartjs
- Tailwind CSS
- Vite → multi-stage Docker build → nginx

---

## Chat UI

The customer chat interface (`/chat-ui`) provides a Claude-like chat experience.

### Features

- Real-time streaming responses
- Menu browsing with image cards
- Order placement and tracking
- Conversation history persistence
- Light / dark theme
- French / English

---

## API Reference

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login → JWT token |
| GET | `/api/auth/me` | Get current user |

### Users (admin only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List users (paginated) |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Menu

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/menu` | List items (paginated, filterable) |
| GET | `/api/menu/:id` | Get single item |
| GET | `/api/menu/by-idx/:idx` | Get item by integer idx |
| POST | `/api/menu` | Create item |
| PUT | `/api/menu/:id` | Update item |
| DELETE | `/api/menu/:id` | Delete item |
| POST | `/api/menu/:id/image` | Upload image |

**Query params:** `page`, `limit`, `category`, `name`, `available`

### Orders

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orders` | List orders (paginated) |
| GET | `/api/orders/:id` | Get order |
| POST | `/api/orders` | Create order |
| PUT | `/api/orders/:id` | Update order / status |
| DELETE | `/api/orders/:id` | Cancel order |

**Statuses:** `pending` → `confirmed` → `preparing` → `ready` → `delivered` / `cancelled`

### Customers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/customers` | List customers (paginated, searchable) |
| GET | `/api/customers/:phone` | Get customer by phone |

### Conversations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/conversations` | List conversations (paginated) |
| GET | `/api/conversations/:sessionId` | Get full conversation |
| POST | `/api/conversations` | Create / upsert conversation |
| PATCH | `/api/conversations/:sessionId/rename` | Rename conversation |
| DELETE | `/api/conversations/:sessionId` | Delete conversation |

### Images

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/images/:type/:idx` | Resolve menu item image URL by idx |

### Chat (agent — port 3000)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Send message (streaming SSE) |
| DELETE | `/api/chat/:sessionId` | Clear session |
| GET | `/health` | Health check |

---

## MCP Tools

The MCP server exposes these tools to the Claude agent:

| Tool | Description |
|------|-------------|
| `get_menu` | List menu items (filter by category / availability) |
| `get_menu_item` | Get single item by ID |
| `create_order` | Place a new order |
| `get_order` | Get order details |
| `update_order` | Update status, notes, address |
| `cancel_order` | Cancel an order |
| `list_orders` | List orders by phone / status |

---

## Local Development (without Docker)

### Prerequisites

- Node.js 18+
- MongoDB running locally

```bash
# Terminal 1 — API
cd api && npm install && npm run dev

# Terminal 2 — Agent
cd agent && npm install && npm run dev

# Terminal 3 — Chat UI
cd chat-ui && npm install && npm run dev

# Terminal 4 — Admin UI
cd admin-ui && npm install && npm run dev
```

| Service | URL |
|---------|-----|
| API | http://localhost:3001 |
| Agent | http://localhost:3000 |
| Chat UI | http://localhost:5173 |
| Admin UI | http://localhost:5174 |

---

## Environment Variables

**`api/.env`**
```env
MONGODB_URI=mongodb://localhost:27017/tchopetyamo
PORT=3001
JWT_SECRET=restaurant-admin-secret
LOG_LEVEL=info
```

**`agent/.env`**
```env
ANTHROPIC_API_KEY=sk-ant-...
MCP_SERVER_PATH=../mcp-server/index.js
API_URL=http://localhost:3001
PORT=3000
```

---

## Menu Categories

`BEIGNETS` · `SALADES` · `BOISSON` · `POULETS` · `BURGER` · `MENUS_COMPOSES`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | MongoDB + Mongoose |
| API | Express.js, JWT, bcryptjs, Pino, Prometheus |
| AI Agent | Anthropic SDK (Claude), MCP Client |
| MCP Server | `@modelcontextprotocol/sdk` |
| Chat UI | Vue 3, Pinia, Vite, vue-i18n |
| Admin UI | Vue 3, Pinia, Vue Router, Chart.js, Tailwind CSS, vue-i18n |
| Infrastructure | Docker Compose, nginx (multi-stage builds) |
