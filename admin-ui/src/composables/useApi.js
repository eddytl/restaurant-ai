const BASE = '/api'

function getToken() {
  return localStorage.getItem('admin-token')
}

async function req(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'API error')
  return data
}

export const api = {
  // Auth
  login: (body) => req('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  // Users (admin only)
  getUsers:   (params = {}) => req('/users?' + new URLSearchParams(params)),
  createUser: (body)        => req('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body)    => req(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteUser: (id)          => req(`/users/${id}`, { method: 'DELETE' }),

  // Menu
  getMenu:        (params = {}) => req('/menu?' + new URLSearchParams(params)),
  createMenuItem: (body)        => req('/menu', { method: 'POST', body: JSON.stringify(body) }),
  updateMenuItem: (id, body)    => req(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteMenuItem: (id)          => req(`/menu/${id}`, { method: 'DELETE' }),
  uploadImage: (id, file) => {
    const token = getToken()
    const fd = new FormData(); fd.append('image', file)
    return fetch(`/api/menu/${id}/image`, {
      method: 'POST', body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(r => r.json())
  },

  // Categories
  getCategories:  ()       => req('/categories'),
  createCategory: (body)   => req('/categories', { method: 'POST', body: JSON.stringify(body) }),
  deleteCategory: (id)     => req(`/categories/${id}`, { method: 'DELETE' }),

  // Orders
  getOrders:   (params = {}) => req('/orders?' + new URLSearchParams(params)),
  updateOrder: (id, body)    => req(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  cancelOrder: (id)          => req(`/orders/${id}`, { method: 'DELETE' }),

  // Customers
  getCustomers: (params = {}) => req('/customers?' + new URLSearchParams(params)),
  getCustomer:  (phone)       => req(`/customers/${phone}`),

  // Conversations
  getConversations:   (params = {}) => req('/conversations?' + new URLSearchParams(params)),
  getConversation:    (sessionId)   => req(`/conversations/${sessionId}`),
  deleteConversation: (sessionId)   => req(`/conversations/${sessionId}`, { method: 'DELETE' }),

  // Branches
  getBranches:   (params = {}) => req('/branches?' + new URLSearchParams(params)),
  createBranch:  (body)        => req('/branches', { method: 'POST', body: JSON.stringify(body) }),
  updateBranch:  (id, body)    => req(`/branches/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteBranch:  (id)          => req(`/branches/${id}`, { method: 'DELETE' }),
}
