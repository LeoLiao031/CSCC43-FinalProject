"use client";
import { Box, Typography, Tabs, Tab, List, ListItem, ListItemText, Button, Alert, TextField, InputAdornment } from "@mui/material";
import { useState, useEffect } from "react";
import { 
  getFriendsList, 
  getIncomingFriendRequests, 
  getOutgoingFriendRequests,
  acceptFriendRequest,
  removeFriend,
  withdrawFriendRequest,
  searchFriends,
  sendFriendRequest
} from "../../../endpoints/api";
import SearchIcon from '@mui/icons-material/Search';

interface FriendsTabProps {
  loginStatus: boolean;
  userId: string;
}

interface Friend {
  user_id: string;
  username: string;
}

interface FriendRequest {
  relation_id: string;
  user_id: string;
  username: string;
}

interface SearchResult {
  user_id: string;
  username: string;
}

export default function FriendsTab({ loginStatus, userId }: FriendsTabProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchFriendsData = async () => {
    if (!loginStatus || !userId) return;

    try {
      const [friendsList, incoming, outgoing] = await Promise.all([
        getFriendsList(userId),
        getIncomingFriendRequests(userId),
        getOutgoingFriendRequests(userId)
      ]);

      if (friendsList.error) {
        setError(friendsList.error);
        return;
      }
      if (incoming.error) {
        setError(incoming.error);
        return;
      }
      if (outgoing.error) {
        setError(outgoing.error);
        return;
      }

      setFriends(friendsList);
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (error) {
      console.error('Error fetching friends data:', error);
      setError("Failed to fetch friends data");
    }
  };

  useEffect(() => {
    fetchFriendsData();
  }, [loginStatus, userId]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    if (!userId) {
      setError("You must be logged in to search for friends");
      return;
    }

    try {
      const results = await searchFriends(searchQuery, userId);
      if (results.error) {
        setError(results.error);
        return;
      }
      if (Array.isArray(results) && results.length > 0) {
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching for friends:', error);
      setError("Failed to search for friends");
    }
  };

  const handleSendFriendRequest = async (recFriendId: string) => {
    try {
      const response = await sendFriendRequest(userId, recFriendId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess("Friend request sent successfully");
      setSearchQuery("");
      setSearchResults([]);
      fetchFriendsData();
    } catch (error) {
      console.error('Error sending friend request:', error);
      setError("Failed to send friend request");
    }
  };

  const handleAcceptRequest = async (reqFriendId: string) => {
    try {
      const response = await acceptFriendRequest(reqFriendId, userId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess("Friend request accepted");
      fetchFriendsData();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      setError("Failed to accept friend request");
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      const response = await removeFriend(userId, friendId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess("Friend removed successfully");
      fetchFriendsData();
    } catch (error) {
      console.error('Error removing friend:', error);
      setError("Failed to remove friend");
    }
  };

  const handleWithdrawRequest = async (recFriendId: string) => {
    try {
      const response = await withdrawFriendRequest(userId, recFriendId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess("Friend request withdrawn");
      fetchFriendsData();
    } catch (error) {
      console.error('Error withdrawing friend request:', error);
      setError("Failed to withdraw friend request");
    }
  };

  if (!loginStatus) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Please log in to view your friends.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Friends
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={selectedTab} onChange={handleTabChange}>
          <Tab label="Friends" />
          <Tab label="Incoming Requests" />
          <Tab label="Outgoing Requests" />
          <Tab label="Add Friend" />
        </Tabs>
      </Box>

      <Box sx={{ mt: 3 }}>
        {selectedTab === 0 && (
          <List>
            {friends.length === 0 ? (
              <Typography>You don&apos;t have any friends yet.</Typography>
            ) : (
              friends.map((friend) => (
                <ListItem
                  key={friend.user_id}
                  secondaryAction={
                    <Button
                      color="error"
                      onClick={() => handleRemoveFriend(friend.user_id)}
                    >
                      Remove
                    </Button>
                  }
                >
                  <ListItemText primary={friend.username} />
                </ListItem>
              ))
            )}
          </List>
        )}

        {selectedTab === 1 && (
          <List>
            {incomingRequests.length === 0 ? (
              <Typography>No incoming friend requests.</Typography>
            ) : (
              incomingRequests.map((request) => (
                <ListItem
                  key={request.relation_id}
                  secondaryAction={
                    <Button
                      color="primary"
                      onClick={() => handleAcceptRequest(request.user_id)}
                    >
                      Accept
                    </Button>
                  }
                >
                  <ListItemText primary={request.username} />
                </ListItem>
              ))
            )}
          </List>
        )}

        {selectedTab === 2 && (
          <List>
            {outgoingRequests.length === 0 ? (
              <Typography>No outgoing friend requests.</Typography>
            ) : (
              outgoingRequests.map((request) => (
                <ListItem
                  key={request.relation_id}
                  secondaryAction={
                    <Button
                      color="error"
                      onClick={() => handleWithdrawRequest(request.user_id)}
                    >
                      Withdraw
                    </Button>
                  }
                >
                  <ListItemText primary={request.username} />
                </ListItem>
              ))
            )}
          </List>
        )}

        {selectedTab === 3 && (
          <Box>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search for users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button onClick={handleSearch}>
                      <SearchIcon />
                    </Button>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            <List>
              {searchResults.length === 0 ? (
                <Typography>No users found. Try searching for a username.</Typography>
              ) : (
                searchResults.map((user) => (
                  <ListItem
                    key={user.user_id}
                    secondaryAction={
                      <Button
                        color="primary"
                        onClick={() => handleSendFriendRequest(user.user_id)}
                      >
                        Add Friend
                      </Button>
                    }
                  >
                    <ListItemText primary={user.username} />
                  </ListItem>
                ))
              )}
            </List>
          </Box>
        )}
      </Box>
    </Box>
  );
} 