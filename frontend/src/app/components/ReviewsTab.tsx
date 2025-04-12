"use client";
import { Box, Typography, TextField, Button, Alert, List, ListItem, ListItemText, IconButton, Rating } from "@mui/material";
import { useState } from "react";
import DeleteIcon from '@mui/icons-material/Delete';
import { createReview, deleteReview, getReviews } from "../../../endpoints/api";

interface ReviewsTabProps {
  loginStatus: boolean;
  userId: number;
}

interface Review {
  review_id: number;
  stock_symbol: string;
  rating: number;
  comment: string;
  created_at: string;
}

export default function ReviewsTab({ loginStatus, userId }: ReviewsTabProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newStockSymbol, setNewStockSymbol] = useState("");
  const [newRating, setNewRating] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newStockSymbol.trim()) {
      setError("Stock symbol cannot be empty");
      return;
    }

    if (!newRating) {
      setError("Please provide a rating");
      return;
    }

    try {
      const response = await createReview(newStockSymbol, newRating, newComment, userId.toString());
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess("Review created successfully!");
      setNewStockSymbol("");
      setNewRating(null);
      setNewComment("");
      fetchReviews();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to create review");
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    try {
      const response = await deleteReview(reviewId.toString(), userId.toString());
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

  const fetchReviews = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await getReviews(userId.toString());
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

  if (!loginStatus) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Please sign in to view and manage your reviews
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Your Stock Reviews
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

      <Box component="form" onSubmit={handleCreateReview} sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Create New Review
        </Typography>
        <TextField
          fullWidth
          label="Stock Symbol"
          variant="outlined"
          value={newStockSymbol}
          onChange={(e) => setNewStockSymbol(e.target.value.toUpperCase())}
          sx={{ mb: 2 }}
        />
        <Box sx={{ mb: 2 }}>
          <Typography component="legend">Rating</Typography>
          <Rating
            value={newRating}
            onChange={(event, newValue) => {
              setNewRating(newValue);
            }}
          />
        </Box>
        <TextField
          fullWidth
          label="Comment"
          variant="outlined"
          multiline
          rows={4}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
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
          You haven&apos;t written any reviews yet. Write one above!
        </Typography>
      ) : (
        <List>
          {reviews.map((review) => (
            <ListItem
              key={review.review_id}
              secondaryAction={
                <IconButton
                  edge="end"
                  onClick={() => handleDeleteReview(review.review_id)}
                >
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">{review.stock_symbol}</Typography>
                    <Rating value={review.rating} readOnly />
                  </Box>
                }
                secondary={
                  <>
                    <Typography variant="body2" color="text.secondary">
                      {review.comment}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(review.created_at).toLocaleDateString()}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
} 