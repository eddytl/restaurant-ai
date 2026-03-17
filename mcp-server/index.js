import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Helper: make API requests
async function apiRequest(method, path, body = null) {
  const url = `${API_URL}${path}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `API error: ${response.status}`);
  }

  return data;
}

// Tool definitions
const tools = [
  {
    name: 'get_menu',
    description:
      'Get menu items from the Restaurant restaurant. Can filter by category or availability. Categories: BEIGNETS, SALADES, BOISSON, POULETS, BURGER, MENUS_COMPOSES',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description:
            'Filter by category: BEIGNETS, SALADES, BOISSON, POULETS, BURGER, MENUS_COMPOSES',
          enum: ['BEIGNETS', 'SALADES', 'BOISSON', 'POULETS', 'BURGER', 'MENUS_COMPOSES']
        },
        available: {
          type: 'boolean',
          description: 'Filter by availability. true = available only, false = unavailable only'
        }
      },
      required: []
    }
  },
  {
    name: 'get_menu_item',
    description: 'Get details of a single menu item by its ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The MongoDB ID of the menu item'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'create_order',
    description:
      'Place a new order at Restaurant restaurant. Requires customer name and at least one menu item.',
    inputSchema: {
      type: 'object',
      properties: {
        customerName: {
          type: 'string',
          description: 'Full name of the customer'
        },
        customerPhone: {
          type: 'string',
          description: 'Phone number of the customer (optional but recommended)'
        },
        deliveryAddress: {
          type: 'string',
          description: 'Delivery address (optional, for delivery orders)'
        },
        items: {
          type: 'array',
          description: 'List of items to order',
          items: {
            type: 'object',
            properties: {
              menuItemId: {
                type: 'string',
                description: 'The MongoDB ID of the menu item'
              },
              quantity: {
                type: 'number',
                description: 'Quantity to order (minimum 1)'
              }
            },
            required: ['menuItemId', 'quantity']
          }
        },
        notes: {
          type: 'string',
          description: 'Special instructions or notes for the order'
        }
      },
      required: ['customerName', 'items']
    }
  },
  {
    name: 'get_order',
    description: 'Get the details and status of a specific order by its ID',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'The MongoDB ID of the order'
        }
      },
      required: ['orderId']
    }
  },
  {
    name: 'update_order',
    description:
      'Update an existing order. Can update status, notes, or delivery address. Cannot update cancelled or delivered orders.',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'The MongoDB ID of the order to update'
        },
        status: {
          type: 'string',
          description: 'New status for the order',
          enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']
        },
        notes: {
          type: 'string',
          description: 'Updated notes or special instructions'
        },
        deliveryAddress: {
          type: 'string',
          description: 'Updated delivery address'
        }
      },
      required: ['orderId']
    }
  },
  {
    name: 'cancel_order',
    description: 'Cancel an existing order. Cannot cancel already cancelled or delivered orders.',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'The MongoDB ID of the order to cancel'
        }
      },
      required: ['orderId']
    }
  },
  {
    name: 'list_orders',
    description: 'List orders with optional filters by customer phone or order status',
    inputSchema: {
      type: 'object',
      properties: {
        customerPhone: {
          type: 'string',
          description: 'Filter orders by customer phone number'
        },
        status: {
          type: 'string',
          description: 'Filter by order status',
          enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']
        }
      },
      required: []
    }
  }
];

// Tool handlers
async function handleGetMenu(input) {
  const params = new URLSearchParams();
  if (input.category) params.append('category', input.category);
  if (input.available !== undefined) params.append('available', input.available.toString());

  const query = params.toString() ? `?${params.toString()}` : '';
  const result = await apiRequest('GET', `/api/menu${query}`);
  return result;
}

async function handleGetMenuItem(input) {
  const result = await apiRequest('GET', `/api/menu/${input.id}`);
  return result;
}

async function handleCreateOrder(input) {
  const result = await apiRequest('POST', '/api/orders', {
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    deliveryAddress: input.deliveryAddress,
    items: input.items,
    notes: input.notes
  });
  return result;
}

async function handleGetOrder(input) {
  const result = await apiRequest('GET', `/api/orders/${input.orderId}`);
  return result;
}

async function handleUpdateOrder(input) {
  const { orderId, ...updates } = input;
  const result = await apiRequest('PUT', `/api/orders/${orderId}`, updates);
  return result;
}

async function handleCancelOrder(input) {
  const result = await apiRequest('DELETE', `/api/orders/${input.orderId}`);
  return result;
}

async function handleListOrders(input) {
  const params = new URLSearchParams();
  if (input.customerPhone) params.append('customerPhone', input.customerPhone);
  if (input.status) params.append('status', input.status);

  const query = params.toString() ? `?${params.toString()}` : '';
  const result = await apiRequest('GET', `/api/orders${query}`);
  return result;
}

// Create MCP server
const server = new Server(
  {
    name: 'tchopetyamo-restaurant-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool call requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'get_menu':
        result = await handleGetMenu(args || {});
        break;
      case 'get_menu_item':
        result = await handleGetMenuItem(args);
        break;
      case 'create_order':
        result = await handleCreateOrder(args);
        break;
      case 'get_order':
        result = await handleGetOrder(args);
        break;
      case 'update_order':
        result = await handleUpdateOrder(args);
        break;
      case 'cancel_order':
        result = await handleCancelOrder(args);
        break;
      case 'list_orders':
        result = await handleListOrders(args || {});
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: false, message: err.message })
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Restaurant MCP Server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
