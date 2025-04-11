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
export const createPortfolio = async (portName: string, cashDep: number, username: string) => {
  const response = await fetch(`${API_BASE_URL}/portfolios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port_name: portName, cash_dep: cashDep, username }),
  });
  return response.json();
};

export const getPortfolios = async (username: string) => {
  const response = await fetch(`${API_BASE_URL}/portfolios/${username}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return response.json();
};

export const deletePortfolio = async (portName: string, username: string) => {
  const response = await fetch(`${API_BASE_URL}/portfolios`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port_name: portName, username }),
  });
  return response.json();
};

export const getPortfolioInfo = async (portName: string, owner: string) => {
  const response = await fetch(`${API_BASE_URL}/portfolios/${portName}/${owner}`);
  return response.json();
};

export const depositCash = async (portName: string, owner: string, amount: number) => {
  const response = await fetch(`${API_BASE_URL}/portfolios/deposit`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port_name: portName, owner, amount }),
  });
  return response.json();
};

export const transferCash = async (givePort: string, getPort: string, owner: string, amount: number) => {
  const response = await fetch(`${API_BASE_URL}/portfolios/transfer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ give_port: givePort, get_port: getPort, owner, amount }),
  });
  return response.json();
};

// Friends Management
export const sendFriendRequest = async (reqFriend: string, recFriend: string) => {
  const response = await fetch(`${API_BASE_URL}/friends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ req_friend: reqFriend, rec_friend: recFriend }),
  });
  return response.json();
};

export const acceptFriendRequest = async (reqFriend: string, recFriend: string) => {
  const response = await fetch(`${API_BASE_URL}/friends/accept`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ req_friend: reqFriend, rec_friend: recFriend }),
  });
  return response.json();
};

export const removeFriend = async (reqFriend: string, recFriend: string) => {
  const response = await fetch(`${API_BASE_URL}/friends`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ req_friend: reqFriend, rec_friend: recFriend }),
  });
  return response.json();
};

export const searchFriends = async (username: string) => {
  const response = await fetch(`${API_BASE_URL}/friends/search/${username}`);
  return response.json();
};

export const withdrawFriendRequest = async (reqFriend: string, recFriend: string) => {
  const response = await fetch(`${API_BASE_URL}/friends/withdraw`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ req_friend: reqFriend, rec_friend: recFriend }),
  });
  return response.json();
};

export const getFriendsList = async (username: string) => {
  const response = await fetch(`${API_BASE_URL}/friends/${username}`);
  return response.json();
};

export const getIncomingFriendRequests = async (username: string) => {
  const response = await fetch(`${API_BASE_URL}/friends/requests/${username}`);
  return response.json();
};

export const getOutgoingFriendRequests = async (username: string) => {
  const response = await fetch(`${API_BASE_URL}/friends/outgoing/${username}`);
  return response.json();
};

export const getNonFriendsList = async (username: string) => {
  const response = await fetch(`${API_BASE_URL}/friends/non-friends/${username}`);
  return response.json();
};
