# Restaurant AI Agent

A complete AI-powered restaurant assistant, a Cameroonian restaurant. Customers can browse the menu, place orders, check order status, and manage their orders via a beautiful Claude-like chat interface.

## Architecture

```
restaurant-ai/
├── api/          - Express.js REST API (port 3001) + MongoDB
├── mcp-server/   - MCP server (stdio transport) wrapping the API
├── agent/        - Express.js AI agent (port 3000) using Anthropic + MCP client
└── chat-ui/      - Vue 3 + Vite chat interface (port 5173)
```

### How it works

1. **Chat UI** sends messages to the **Agent** via HTTP
2. **Agent** uses Claude (Anthropic SDK) with tools provided by the **MCP Server**
3. **MCP Server** exposes restaurant tools (menu, orders) that call the **API**
4. **API** reads/writes from **MongoDB**

---

## Prerequisites

- Node.js 18+
- MongoDB running locally (or provide a remote URI)
- An Anthropic API key

---

## Setup & Running

### Step 1 — Start MongoDB

Make sure MongoDB is running on your machine:

```bash
# Linux/macOS (systemd)
sudo systemctl start mongod

# macOS (homebrew)
brew services start mongodb-community

# Or run directly
mongod --dbpath /data/db
```

### Step 2 — Seed the database

```bash
cd api
npm install
cp .env.example .env        # edit if needed
npm run seed
```

Expected output:
```
Connected to MongoDB
Clearing existing menu items...
Inserting 41 menu items...
  BEIGNETS: 8 items
  SALADES: 3 items
  BOISSON: 5 items
  POULETS: 4 items
  BURGER: 2 items
  MENUS_COMPOSES: 19 items
Database seeded successfully!
```

### Step 3 — Start the API server (port 3001)

```bash
cd api
npm start
# or for development with auto-reload:
npm run dev
```

Test it:
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/menu
```

### Step 4 — Install MCP server dependencies

```bash
cd mcp-server
npm install
```

The MCP server is spawned automatically by the agent — you don't need to start it manually.

### Step 5 — Start the Agent server (port 3000)

```bash
cd agent
npm install
cp .env.example .env
# Edit .env and set your ANTHROPIC_API_KEY
nano .env
npm start
```

Your `.env` should look like:
```
ANTHROPIC_API_KEY=sk-ant-...
MCP_SERVER_PATH=../mcp-server/index.js
API_URL=http://localhost:3001
PORT=3000
```

Test it:
```bash
curl http://localhost:3000/health

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is on the menu?"}'
```

### Step 6 — Start the Chat UI (port 5173)

```bash
cd chat-ui
npm install
npm run dev
```

Open your browser at: **http://localhost:5173**

---

## API Reference

### Menu Endpoints (port 3001)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/menu` | List all menu items |
| GET | `/api/menu?category=BEIGNETS` | Filter by category |
| GET | `/api/menu?available=true` | Filter by availability |
| GET | `/api/menu/:id` | Get a single menu item |
| POST | `/api/menu` | Create a menu item |
| PUT | `/api/menu/:id` | Update a menu item |
| DELETE | `/api/menu/:id` | Delete a menu item |

**Categories:** `BEIGNETS`, `SALADES`, `BOISSON`, `POULETS`, `BURGER`, `MENUS_COMPOSES`

### Order Endpoints (port 3001)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orders` | List all orders |
| GET | `/api/orders?status=pending` | Filter by status |
| GET | `/api/orders?customerPhone=...` | Filter by phone |
| GET | `/api/orders/:id` | Get an order (populated) |
| POST | `/api/orders` | Create an order |
| PUT | `/api/orders/:id` | Update an order |
| DELETE | `/api/orders/:id` | Cancel an order |

**Order statuses:** `pending`, `confirmed`, `preparing`, `ready`, `delivered`, `cancelled`

### Chat Endpoint (port 3000)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Send a message |
| DELETE | `/api/chat/:sessionId` | Clear a session |
| GET | `/health` | Health check |

**POST /api/chat body:**
```json
{
  "message": "Show me the menu",
  "sessionId": "optional-existing-session-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Here is our menu...",
    "sessionId": "uuid-v4"
  }
}
```

---

## MCP Tools

The MCP server exposes these tools to the AI agent:

| Tool | Description |
|------|-------------|
| `get_menu` | Get menu items (filter by category/availability) |
| `get_menu_item` | Get a single menu item by ID |
| `create_order` | Place a new order |
| `get_order` | Get order details by ID |
| `update_order` | Update order status/notes/address |
| `cancel_order` | Cancel an order |
| `list_orders` | List orders (filter by phone/status) |

---

## Menu

### BEIGNETS
| Item | Price |
|------|-------|
| BHB | 1,500 XAF |
| BH | 1,000 XAF |
| BH 2 ailes | 2,000 XAF |
| Portion de haricot | 600 XAF |
| Bouillie | 600 XAF |
| Portion de beignets maïs | 600 XAF |
| Portion de beignets farine | 600 XAF *(épuisé)* |
| Promotion | 100 XAF |

### SALADES
| Item | Price |
|------|-------|
| Salade bitchakala | 2,500 XAF |
| Salade de fruits | 2,200 XAF |
| Salade simple | 1,500 XAF |

### BOISSON
| Item | Price |
|------|-------|
| Yamo Lemon | 1,500 XAF |
| Yamo Ananas | 1,500 XAF |
| DJARA | 1,000 XAF |
| Abangalafa | 2,000 XAF |
| Yaourt bikutsi | 2,500 XAF |

### POULETS
| Item | Price |
|------|-------|
| Ndogmangolo soya/poulet (New) | 2,500 XAF |
| Poulet pané | 1,100 XAF |
| Frites de plantain | 600 XAF |
| Poulet braisé | 2,800 XAF |

### BURGER
| Item | Price |
|------|-------|
| Burger poulet | 3,000 XAF |
| Burger boeuf | 3,500 XAF |

### MENUS COMPOSÉS (selection)
| Item | Price | Contents |
|------|-------|----------|
| Menu spécial | 4,000 XAF | 3 morceaux de poulets + frites |
| Menu 9 | 5,000 XAF | Salade simple + 2 morceaux de poulets + frites + djara |
| Menu pour 2 | 12,000 XAF | 4 ailes + 4 morceaux + 2 frites + 2 djara + 2 salades |
| Menu pour 3 | 16,000 XAF | 6 morceaux + ailes + 3 frites + 3 djara + 3 salades |
| Menu pour 4 | 24,000 XAF | 8 morceaux + 8 ailes + 4 frites + 4 djara + 4 salades |

---

## Development

### Run everything at once (requires `concurrently`)

```bash
npm install -g concurrently

concurrently \
  "cd api && npm run dev" \
  "cd agent && npm run dev" \
  "cd chat-ui && npm run dev"
```

### Environment variables

**api/.env**
```
MONGODB_URI=mongodb://localhost:27017/restaurant
PORT=3001
```

**agent/.env**
```
ANTHROPIC_API_KEY=sk-ant-...
MCP_SERVER_PATH=../mcp-server/index.js
API_URL=http://localhost:3001
PORT=3000
```

---

## Tech Stack

- **API:** Express.js, Mongoose, MongoDB
- **MCP Server:** `@modelcontextprotocol/sdk`, node-fetch
- **Agent:** Anthropic SDK (`claude-opus-4-5`), MCP Client, Express.js
- **Chat UI:** Vue 3, Pinia, Vite, Axios
