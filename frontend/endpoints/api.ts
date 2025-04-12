const API_BASE_URL = 'http://localhost:4000';

// User Management
export const createUser = async (username: string, password: string, email: string) => {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email }),
  });
  return response.json();
};

export const getUser = async (username: string) => {
  const response = await fetch(`${API_BASE_URL}/users/${username}`);
  return response.json();
};

export const searchUsers = async (query: string) => {
  const response = await fetch(`${API_BASE_URL}/users/search/${query}`);
  return response.json();
};

// Portfolio Management
export const createPortfolio = async (portName: string, cashDep: number, userId: number) => {
  const response = await fetch(`${API_BASE_URL}/portfolios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port_name: portName, cash_dep: cashDep, user_id: userId }),
  });
  return response.json();
};

export const deletePortfolio = async (portName: string, userId: number) => {
  const response = await fetch(`${API_BASE_URL}/portfolios`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port_name: portName, user_id: userId }),
  });
  return response.json();
};

export const getPortfolios = async (userId: number) => {
  const response = await fetch(`${API_BASE_URL}/portfolios/${userId}`);
  return response.json();
};

export const getPortfolioInfo = async (portId: string, userId: string) => {
  const response = await fetch(`${API_BASE_URL}/portfolios/${portId}/${userId}`);
  return response.json();
};

export const depositCash = async (portId: number, userId: number, amount: number) => {
  const response = await fetch(`${API_BASE_URL}/portfolios/deposit`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port_id: portId, user_id: userId, amount }),
  });
  return response.json();
};

export const withdrawCash = async (portId: number, userId: number, amount: number) => {
  const response = await fetch(`${API_BASE_URL}/portfolios/withdraw`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port_id: portId, user_id: userId, amount }),
  });
  return response.json();
};

export const transferCash = async (givePortId: number, getPortId: number, owner: number, amount: number) => {
  const response = await fetch(`${API_BASE_URL}/portfolios/transfer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ give_port_id: givePortId, get_port_id: getPortId, owner: owner, amount: amount }),
  });
  return response.json();
};

// Stock Management
export const buyStock = async (portId: string, stockSymbol: string, amount: number, userId: string) => {
  const response = await fetch(`${API_BASE_URL}/portfolios/stocks/buy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port_id: portId, stock_symbol: stockSymbol, amount, user_id: userId }),
  });
  return response.json();
};

export const sellStock = async (portId: string, stockSymbol: string, amount: number, userId: string) => {
  const response = await fetch(`${API_BASE_URL}/portfolios/stocks/sell`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port_id: portId, stock_symbol: stockSymbol, amount, user_id: userId }),
  });
  return response.json();
};

// Stock History
export const addStockHistory = async (stockSymbol: string, timestamp: string, openPrice: number, highPrice: number, lowPrice: number, closePrice: number, volume: number) => {
  const response = await fetch(`${API_BASE_URL}/stocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock_symbol: stockSymbol, timestamp, open_price: openPrice, high_price: highPrice, low_price: lowPrice, close_price: closePrice, volume }),
  });
  return response.json();
};

export const getStockData = async (stockSymbol: string, date?: string) => {
  const url = date ? `${API_BASE_URL}/stocks/${stockSymbol}?date=${date}` : `${API_BASE_URL}/stocks/${stockSymbol}`;
  const response = await fetch(url);
  return response.json();
};

export const getStockInfo = async (stockSymbol: string, limit: number = 10, offset: number = 0) => {
  const response = await fetch(`${API_BASE_URL}/stocks/info/${stockSymbol}?limit=${limit}&offset=${offset}`);
  return response.json();
};

export const getMovingAverage = async (stockSymbol: string, period: number = 7) => {
  const response = await fetch(`${API_BASE_URL}/api/stock/${stockSymbol}/moving-average?period=${period}`);
  return response.json();
};

// Stock Lists
export const createStockList = async (listName: string, userId: string, visibility: string = 'private') => {
  const response = await fetch(`${API_BASE_URL}/stocklists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ list_name: listName, user_id: userId, visibility }),
  });
  return response.json();
};

export const getStockLists = async (userId: string) => {
  const response = await fetch(`${API_BASE_URL}/stocklists/${userId}`);
  return response.json();
};

export const deleteStockList = async (listId: string, userId: string) => {
  const response = await fetch(`${API_BASE_URL}/stocklists`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ list_id: listId, user_id: userId }),
  });
  return response.json();
};

export const getPublicStockLists = async () => {
  const response = await fetch(`${API_BASE_URL}/stocklists/public`);
  return response.json();
};

export const getSharedStockLists = async (userId: string) => {
  const response = await fetch(`${API_BASE_URL}/stocklists/shared/${userId}`);
  return response.json();
};

export const getStockListData = async (listId: string) => {
  const response = await fetch(`${API_BASE_URL}/stocklists/data/${listId}`);
  return response.json();
};

export const addStockToList = async (listId: string, stockSymbol: string, quantity: number, userId: string) => {
  const response = await fetch(`${API_BASE_URL}/stocklists/${listId}/stocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ list_id: listId, stock_symbol: stockSymbol, quantity, user_id: userId }),
  });
  return response.json();
};

export const removeStockFromList = async (listId: string, stockSymbol: string, userId: string) => {
  const response = await fetch(`${API_BASE_URL}/stocklists/${listId}/stocks`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ list_id: listId, stock_symbol: stockSymbol, user_id: userId }),
  });
  return response.json();
};

export const shareStockList = async (listId: string, userId: string, currentUserId: string) => {
  const response = await fetch(`${API_BASE_URL}/stocklists/${listId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ list_id: listId, user_id: userId, current_user_id: currentUserId }),
  });
  return response.json();
};

export const getStockListStatistics = async (listId: string, userId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/stocklist/${listId}/statistics?user_id=${userId}`);
  return response.json();
};

// Friends Management
export const sendFriendRequest = async (reqFriendId: string, recFriendId: string) => {
  const response = await fetch(`${API_BASE_URL}/friends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ req_friend_id: reqFriendId, rec_friend_id: recFriendId }),
  });
  return response.json();
};

export const acceptFriendRequest = async (reqFriendId: string, recFriendId: string) => {
  const response = await fetch(`${API_BASE_URL}/friends/accept`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ req_friend_id: reqFriendId, rec_friend_id: recFriendId }),
  });
  return response.json();
};

export const removeFriend = async (reqFriendId: string, recFriendId: string) => {
  const response = await fetch(`${API_BASE_URL}/friends`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ req_friend_id: reqFriendId, rec_friend_id: recFriendId }),
  });
  return response.json();
};

export const searchFriends = async (query: string, userId: string) => {
  const response = await fetch(`${API_BASE_URL}/friends/search/${query}/${userId}`);
  return response.json();
};

export const withdrawFriendRequest = async (reqFriendId: string, recFriendId: string) => {
  const response = await fetch(`${API_BASE_URL}/friends/withdraw`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ req_friend_id: reqFriendId, rec_friend_id: recFriendId }),
  });
  return response.json();
};

export const getFriendsList = async (userId: string) => {
  const response = await fetch(`${API_BASE_URL}/friends/${userId}`);
  return response.json();
};

export const getIncomingFriendRequests = async (userId: string) => {
  const response = await fetch(`${API_BASE_URL}/friends/requests/${userId}`);
  return response.json();
};

export const getOutgoingFriendRequests = async (userId: string) => {
  const response = await fetch(`${API_BASE_URL}/friends/outgoing/${userId}`);
  return response.json();
};

export const getNonFriendsList = async (userId: string) => {
  const response = await fetch(`${API_BASE_URL}/friends/non-friends/${userId}`);
  return response.json();
};

// Stock List Reviews
export const getStockListReviews = async (listId: string, userId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/review/list/${listId}?user_id=${userId}`);
  return response.json();
};

export const createStockListReview = async (listId: string, userId: string, content: string) => {
  const response = await fetch(`${API_BASE_URL}/api/review/${listId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, content }),
  });
  return response.json();
};

export const editStockListReview = async (reviewId: string, userId: string, content: string) => {
  const response = await fetch(`${API_BASE_URL}/api/review/${reviewId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, content }),
  });
  return response.json();
};

export const deleteStockListReview = async (reviewId: string, userId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/review/${reviewId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  return response.json();
};
