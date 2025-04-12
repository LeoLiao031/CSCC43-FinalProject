"use client";
import { Box, Typography, TextField, Button, Alert, List, ListItem, ListItemText, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel } from "@mui/material";
import { useState, useEffect } from "react";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getStockListReviews, createStockListReview, editStockListReview, deleteStockListReview, getStockListData, getPublicStockLists, getSharedStockLists, getStockLists } from "../../../endpoints/api";

interface ReviewsTabProps {
  loginStatus: boolean;
  userId: number;
  username: string;
}

interface Review {
  review_id: number;
  content: string;
  created_at: string;
  reviewer: string;
  edited_at?: string;
}

interface StockList {
  list_id: number;
  name: string;
  user_id: number;
  visibility: string;
}

export default function ReviewsTab({ loginStatus, userId, username }: ReviewsTabProps) {
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [accessibleLists, setAccessibleLists] = useState<StockList[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editedContent, setEditedContent] = useState("");

  useEffect(() => {
    if (loginStatus) {
      fetchAccessibleLists();
    }
  }, [loginStatus]);

  useEffect(() => {
    if (selectedListId) {
      checkOwnership();
      fetchReviews();
    }
  }, [selectedListId]);

  const fetchAccessibleLists = async () => {
    try {
      const [publicLists, sharedLists, myLists] = await Promise.all([
        getPublicStockLists(),
        getSharedStockLists(userId.toString()),
        getStockLists(userId.toString())
      ]);

      if (publicLists.error) {
        setError(publicLists.error);
        return;
      }
      if (sharedLists.error) {
        setError(sharedLists.error);
        return;
      }
      if (myLists.error) {
        setError(myLists.error);
        return;
      }

      // Combine and deduplicate lists
      const combinedLists = [...myLists, ...publicLists, ...sharedLists];
      const uniqueLists = combinedLists.reduce((acc: StockList[], current: StockList) => {
        const exists = acc.find(item => item.list_id === current.list_id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      setAccessibleLists(uniqueLists);
    } catch (error) {
      console.error('Error fetching accessible lists:', error);
      setError("Failed to fetch accessible stock lists");
    }
  };

  const checkOwnership = async () => {
    if (!selectedListId) return;
    try {
      const response = await getStockListData(selectedListId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setIsOwner(response.stockList.creator_name === username);
    } catch (error) {
      console.error('Error checking ownership:', error);
      setError("Failed to check stock list ownership");
    }
  };

  const fetchReviews = async () => {
    if (!selectedListId) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await getStockListReviews(selectedListId, userId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setReviews(response || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError("Failed to fetch reviews");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedListId) {
      setError("Please select a stock list first");
      return;
    }

    if (!newReview.trim()) {
      setError("Review content cannot be empty");
      return;
    }

    try {
      const response = await createStockListReview(selectedListId, userId, newReview);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess("Review created successfully!");
      setNewReview("");
      fetchReviews();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to create review");
    }
  };

  const handleEditReview = async () => {
    if (!editingReview || !editedContent.trim()) {
      setError("Review content cannot be empty");
      return;
    }

    try {
      const response = await editStockListReview(
        editingReview.review_id,
        userId,
        editedContent
      );
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess("Review updated successfully!");
      setEditDialogOpen(false);
      setEditingReview(null);
      setEditedContent("");
      fetchReviews();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to update review");
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    try {
      const response = await deleteStockListReview(reviewId, userId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess("Review deleted successfully!");
      fetchReviews();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to delete review");
    }
  };

  const handleEditDialogOpen = (review: Review) => {
    setEditingReview(review);
    setEditedContent(review.content);
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditingReview(null);
    setEditedContent("");
  };

  if (!loginStatus) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Please sign in to view and manage reviews
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Reviews
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

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="stock-list-select-label">Select Stock List</InputLabel>
        <Select
          labelId="stock-list-select-label"
          value={selectedListId || ''}
          label="Select Stock List"
          onChange={(e) => setSelectedListId(e.target.value as number)}
        >
          {accessibleLists.map((list) => (
            <MenuItem key={list.list_id} value={list.list_id}>
              {list.name} ({list.visibility})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedListId && (
        <>
          <Box component="form" onSubmit={handleCreateReview} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Write a Review
            </Typography>
            <TextField
              fullWidth
              label="Your Review"
              variant="outlined"
              multiline
              rows={4}
              value={newReview}
              onChange={(e) => setNewReview(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
            >
              Submit Review
            </Button>
          </Box>

          {isLoading ? (
            <Typography>Loading reviews...</Typography>
          ) : reviews.length === 0 ? (
            <Typography>
              No reviews yet. Be the first to write one!
            </Typography>
          ) : (
            <List>
              {reviews.map((review) => (
                <ListItem
                  key={review.review_id}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {review.reviewer === username && (
                        <IconButton
                          size="small"
                          onClick={() => handleEditDialogOpen(review)}
                          sx={{ color: 'primary.main' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                      {(review.reviewer === username || isOwner) && (
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteReview(review.review_id)}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" component="span">
                          {review.reviewer}
                        </Typography>
                        {review.reviewer === username && (
                          <Typography variant="caption" color="primary">
                            (Your Review)
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box component="span">
                        <Typography variant="body2" color="text.secondary" component="span" display="block">
                          {review.content}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" component="span" display="block">
                          {new Date(review.created_at).toLocaleDateString()}
                          {review.edited_at && (
                            <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 1 }}>
                              (edited)
                            </Typography>
                          )}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </>
      )}

      <Dialog open={editDialogOpen} onClose={handleEditDialogClose}>
        <DialogTitle>Edit Review</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Your Review"
            variant="outlined"
            multiline
            rows={4}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogClose}>Cancel</Button>
          <Button onClick={handleEditReview} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 