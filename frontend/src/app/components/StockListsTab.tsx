"use client";
import { Box, Typography, TextField, Button, Alert, List, ListItem, ListItemText, IconButton, Accordion, AccordionSummary, AccordionDetails, Select, MenuItem, FormControl, InputLabel, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { useState, useEffect } from "react";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ShareIcon from '@mui/icons-material/Share';
import { createStockList, deleteStockList, getStockLists, addStockToList, removeStockFromList, getStockListData, getFriendsList, shareStockList, getPublicStockLists, getSharedStockLists } from "../../../endpoints/api";

interface StockListsTabProps {
  loginStatus: boolean;
  userId: number;
  username: string;
}

interface StockList {
  list_id: number;
  user_id: number;
  name: string;
  created_at: string;
  visibility: string;
  stocks?: string[];
  creator_name?: string;
}

interface StockItem {
  stock_symbol: string;
  quantity: number;
  stock_name: string;
  latest_price: string;
}

interface DetailedStockList {
  stockList: {
    list_id: number;
    list_name: string;
    visibility: string;
    created_at: string;
    creator_name: string;
  };
  stockItems: StockItem[];
}

interface Friend {
  friend_username: string;
  user_id: number;
}

export default function StockListsTab({ loginStatus, userId, username }: StockListsTabProps) {
  const [stockLists, setStockLists] = useState<StockList[]>([]);
  const [publicLists, setPublicLists] = useState<StockList[]>([]);
  const [sharedLists, setSharedLists] = useState<StockList[]>([]);
  const [newListName, setNewListName] = useState("");
  const [newListVisibility, setNewListVisibility] = useState("private");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedList, setSelectedList] = useState<StockList | null>(null);
  const [newStockSymbol, setNewStockSymbol] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedList, setExpandedList] = useState<number | null>(null);
  const [detailedLists, setDetailedLists] = useState<{ [key: number]: DetailedStockList }>({});
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<number | null>(null);
  const [newStockQuantity, setNewStockQuantity] = useState<number>(1);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedListForSharing, setSelectedListForSharing] = useState<StockList | null>(null);

  useEffect(() => {
    if (loginStatus) {
      fetchStockLists();
      fetchFriends();
      fetchPublicLists();
      fetchSharedLists();
    }
  }, [loginStatus, username]);

  const fetchFriends = async () => {
    try {
      const response = await getFriendsList(username);
      if (response.error) {
        setError(response.error);
        return;
      }
      // Transform the response to include user_id
      const friendsWithIds = response.map((friend: { friend_username: string }, index: number) => ({
        ...friend,
        user_id: index + 1 // Temporary ID for UI purposes
      }));
      setFriends(friendsWithIds || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
      setError("Failed to fetch friends");
    }
  };

  const fetchPublicLists = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await getPublicStockLists();
      if (response.error) {
        setError(response.error);
        return;
      }
      setPublicLists(response || []);
    } catch (error) {
      console.error('Error fetching public lists:', error);
      setError("Failed to fetch public lists");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSharedLists = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await getSharedStockLists(userId.toString());
      if (response.error) {
        setError(response.error);
        return;
      }
      setSharedLists(response || []);
    } catch (error) {
      console.error('Error fetching shared lists:', error);
      setError("Failed to fetch shared lists");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newListName.trim()) {
      setError("List name cannot be empty");
      return;
    }

    try {
      const response = await createStockList(newListName, userId.toString(), newListVisibility);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess("Stock list created successfully!");
      setNewListName("");
      setNewListVisibility("private");
      fetchStockLists();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to create stock list");
    }
  };

  const handleDeleteList = async (listId: number) => {
    try {
      const response = await deleteStockList(listId, userId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess("Stock list deleted successfully!");
      fetchStockLists();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to delete stock list");
    }
  };

  const handleAddStock = async () => {
    if (!selectedList || !newStockSymbol.trim()) {
      setError("Please select a list and enter a stock symbol");
      return;
    }

    if (newStockQuantity <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }

    try {
      const response = await addStockToList(selectedList.list_id, newStockSymbol, newStockQuantity, userId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess(`Successfully added ${newStockSymbol} to ${selectedList.name}`);
      setNewStockSymbol("");
      setNewStockQuantity(1);
      await fetchDetailedList(selectedList.list_id);
      fetchStockLists();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to add stock to list");
    }
  };

  const handleRemoveStock = async (listId: number, stockSymbol: string) => {
    try {
      const response = await removeStockFromList(listId, stockSymbol, userId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess(`Successfully removed ${stockSymbol} from the list`);
      await fetchDetailedList(listId);
      fetchStockLists();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to remove stock from list");
    }
  };

  const handleShareDialogOpen = (list: StockList) => {
    setSelectedListForSharing(list);
    setShareDialogOpen(true);
  };

  const handleShareDialogClose = () => {
    setShareDialogOpen(false);
    setSelectedListForSharing(null);
    setSelectedFriend(null);
  };

  const handleShareList = async () => {
    if (!selectedListForSharing || !selectedFriend) {
      setError("Please select a friend to share with");
      return;
    }

    try {
      const friend = friends.find(f => f.user_id === selectedFriend);
      if (!friend) {
        setError("Selected friend not found");
        return;
      }

      const response = await shareStockList(selectedListForSharing.list_id, friend.friend_username, userId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess(`Successfully shared list with ${friend.friend_username}`);
      
      // Update the visibility of the shared list
      setStockLists(prevLists => 
        prevLists.map(list => 
          list.list_id === selectedListForSharing.list_id 
            ? { ...list, visibility: "shared" }
            : list
        )
      );
      
      handleShareDialogClose();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to share list");
    }
  };

  const fetchStockLists = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await getStockLists(userId.toString());
      if (response.error) {
        setError(response.error);
        return;
      }
      setStockLists(response || []);
    } catch (error) {
      console.error('Error fetching stock lists:', error);
      setError("Failed to fetch stock lists");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDetailedList = async (listId: number) => {
    try {
      const response = await getStockListData(listId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setDetailedLists(prev => ({
        ...prev,
        [listId]: response
      }));
    } catch (error) {
      console.error('Error fetching detailed list:', error);
      setError("Failed to fetch list details");
    }
  };

  const handleAccordionChange = (listId: number) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedList(isExpanded ? listId : null);
    if (isExpanded && !detailedLists[listId]) {
      fetchDetailedList(listId);
    }
  };

  if (!loginStatus) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Please sign in to view and manage your stock lists
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Your Stock Lists
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

      <Box component="form" onSubmit={handleCreateList} sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Create New Stock List
        </Typography>
        <TextField
          fullWidth
          label="List Name"
          variant="outlined"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Visibility</InputLabel>
          <Select
            value={newListVisibility}
            label="Visibility"
            onChange={(e) => setNewListVisibility(e.target.value)}
          >
            <MenuItem value="private">Private</MenuItem>
            <MenuItem value="public">Public</MenuItem>
          </Select>
        </FormControl>
        <Button
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 2 }}
        >
          Create List
        </Button>
      </Box>

      {isLoading ? (
        <Typography>Loading stock lists...</Typography>
      ) : (
        <>
          <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
            Your Lists
          </Typography>
          {stockLists.length === 0 ? (
            <Typography>
              You don&apos;t have any stock lists yet. Create one above!
            </Typography>
          ) : (
            <Box sx={{ width: '100%' }}>
              {stockLists.map((list) => (
                <Accordion
                  key={list.list_id}
                  expanded={expandedList === list.list_id}
                  onChange={handleAccordionChange(list.list_id)}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '&:before': {
                      display: 'none',
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      '& .MuiAccordionSummary-content': {
                        alignItems: 'center',
                      },
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      width: '100%',
                    }}>
                      <Typography variant="h6">{list.name}</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2
                      }}>
                        <Typography variant="body1">
                          List Details
                        </Typography>
                        <Box>
                          {list.visibility === "private" && (
                            <IconButton
                              onClick={() => {
                                setSelectedFriend(null);
                              }}
                              color="primary"
                              sx={{ mr: 1 }}
                            >
                              <ShareIcon />
                            </IconButton>
                          )}
                          <IconButton
                            onClick={() => handleDeleteList(list.list_id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="body2">
                          Created: {new Date(list.created_at).toLocaleDateString()}
                        </Typography>
                        <Typography variant="body2">
                          Visibility: {list.visibility}
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            Stocks in List:
                          </Typography>
                          {(() => {
                            const detailedList = detailedLists[list.list_id];
                            if (!detailedList?.stockItems || detailedList.stockItems.length === 0) {
                              return (
                                <Typography variant="body2" color="text.secondary">
                                  No stocks in this list
                                </Typography>
                              );
                            }
                            return (
                              <List>
                                {detailedList.stockItems.map((stock) => (
                                  <ListItem
                                    key={stock.stock_symbol}
                                    secondaryAction={
                                      <IconButton
                                        edge="end"
                                        onClick={() => handleRemoveStock(list.list_id, stock.stock_symbol)}
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    }
                                  >
                                    <ListItemText 
                                      primary={stock.stock_symbol}
                                      secondary={
                                        <>
                                          <Typography variant="body2" component="span">
                                            {stock.stock_name}
                                          </Typography>
                                          <br />
                                          <Typography variant="body2" component="span">
                                            Quantity: {stock.quantity} | Latest Price: ${stock.latest_price}
                                          </Typography>
                                        </>
                                      }
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            );
                          })()}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                          <TextField
                            size="small"
                            label="Stock Symbol"
                            value={newStockSymbol}
                            onChange={(e) => setNewStockSymbol(e.target.value.toUpperCase())}
                          />
                          <TextField
                            size="small"
                            label="Quantity"
                            type="number"
                            value={newStockQuantity}
                            onChange={(e) => setNewStockQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            inputProps={{ min: 1 }}
                            sx={{ width: '100px' }}
                          />
                          <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => {
                              setSelectedList(list);
                              handleAddStock();
                            }}
                          >
                            Add Stock
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<ShareIcon />}
                            onClick={() => handleShareDialogOpen(list)}
                          >
                            Share
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}

          <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
            Shared Lists
          </Typography>
          {sharedLists.length === 0 ? (
            <Typography>
              No shared lists available at the moment.
            </Typography>
          ) : (
            <Box sx={{ width: '100%' }}>
              {sharedLists.map((list) => (
                <Accordion
                  key={list.list_id}
                  expanded={expandedList === list.list_id}
                  onChange={handleAccordionChange(list.list_id)}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '&:before': {
                      display: 'none',
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      '& .MuiAccordionSummary-content': {
                        alignItems: 'center',
                      },
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      width: '100%',
                    }}>
                      <Typography variant="h6">{list.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                        Shared by {detailedLists[list.list_id]?.stockList?.creator_name || list.user_id}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="body2">
                          Created: {new Date(list.created_at).toLocaleDateString()}
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            Stocks in List:
                          </Typography>
                          {(() => {
                            const detailedList = detailedLists[list.list_id];
                            if (!detailedList?.stockItems || detailedList.stockItems.length === 0) {
                              return (
                                <Typography variant="body2" color="text.secondary">
                                  No stocks in this list
                                </Typography>
                              );
                            }
                            return (
                              <List>
                                {detailedList.stockItems.map((stock) => (
                                  <ListItem key={stock.stock_symbol}>
                                    <ListItemText 
                                      primary={stock.stock_symbol}
                                      secondary={
                                        <>
                                          <Typography variant="body2" component="span">
                                            {stock.stock_name}
                                          </Typography>
                                          <br />
                                          <Typography variant="body2" component="span">
                                            Quantity: {stock.quantity} | Latest Price: ${stock.latest_price}
                                          </Typography>
                                        </>
                                      }
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            );
                          })()}
                        </Box>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}

          <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
            Public Lists
          </Typography>
          {publicLists.length === 0 ? (
            <Typography>
              No public lists available at the moment.
            </Typography>
          ) : (
            <Box sx={{ width: '100%' }}>
              {publicLists.map((list) => (
                <Accordion
                  key={list.list_id}
                  expanded={expandedList === list.list_id}
                  onChange={handleAccordionChange(list.list_id)}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '&:before': {
                      display: 'none',
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      '& .MuiAccordionSummary-content': {
                        alignItems: 'center',
                      },
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      width: '100%',
                    }}>
                      <Typography variant="h6">{list.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                        by {detailedLists[list.list_id]?.stockList?.creator_name || list.user_id}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="body2">
                          Created: {new Date(list.created_at).toLocaleDateString()}
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            Stocks in List:
                          </Typography>
                          {(() => {
                            const detailedList = detailedLists[list.list_id];
                            if (!detailedList?.stockItems || detailedList.stockItems.length === 0) {
                              return (
                                <Typography variant="body2" color="text.secondary">
                                  No stocks in this list
                                </Typography>
                              );
                            }
                            return (
                              <List>
                                {detailedList.stockItems.map((stock) => (
                                  <ListItem key={stock.stock_symbol}>
                                    <ListItemText 
                                      primary={stock.stock_symbol}
                                      secondary={
                                        <>
                                          <Typography variant="body2" component="span">
                                            {stock.stock_name}
                                          </Typography>
                                          <br />
                                          <Typography variant="body2" component="span">
                                            Quantity: {stock.quantity} | Latest Price: ${stock.latest_price}
                                          </Typography>
                                        </>
                                      }
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            );
                          })()}
                        </Box>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </>
      )}

      <Dialog open={shareDialogOpen} onClose={handleShareDialogClose}>
        <DialogTitle>Share Stock List</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, minWidth: 300 }}>
            <FormControl fullWidth>
              <InputLabel>Select Friend</InputLabel>
              <Select
                value={selectedFriend || ''}
                label="Select Friend"
                onChange={(e) => setSelectedFriend(Number(e.target.value))}
              >
                {friends.map((friend) => (
                  <MenuItem key={friend.user_id} value={friend.user_id}>
                    {friend.friend_username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleShareDialogClose}>Cancel</Button>
          <Button 
            onClick={handleShareList}
            variant="contained"
            disabled={!selectedFriend}
          >
            Share
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 