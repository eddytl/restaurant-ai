# Build context must be the repo root (set in docker-compose)
FROM node:18-alpine

WORKDIR /app

# Install mcp-server deps
COPY mcp-server/package*.json ./mcp-server/
RUN cd mcp-server && npm install --production

# Install agent deps
COPY agent/package*.json ./agent/
RUN cd agent && npm install --production

# Copy source
COPY mcp-server/ ./mcp-server/
COPY agent/ ./agent/

WORKDIR /app/agent

EXPOSE 3000

CMD ["node", "server.js"]
