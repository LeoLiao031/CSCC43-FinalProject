"use client";
import { Box, Typography, TextField, Button, Alert } from "@mui/material";
import { useState } from "react";
import { createUser, getUser } from "../../../endpoints/api";

interface AccountTabProps {
  loginStatus: boolean;
  setLoginStatus: (status: boolean, username?: string, id?: number) => void;
  username: string;
  setUsername: (username: string) => void;
}

export default function AccountTab({ loginStatus, setLoginStatus, username, setUsername }: AccountTabProps) {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isRegistering) {
        // Register new user
        const response = await createUser(username, password, email);
        if (response.error) {
          setError(response.error);
          return;
        }
        setLoginStatus(true, username, response.id);
      } else {
        // Login existing user
        const response = await getUser(username);
        if (response.error) {
          setError("Invalid username or password");
          return;
        }
        // TODO: Implement proper password verification
        if (response.password === password) {
          setLoginStatus(true, username, response.id);
        } else {
          setError("Invalid username or password");
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError("An error occurred. Please try again.");
    }
  };

  const handleSignOut = () => {
    setLoginStatus(false);
    setUsername("");
    setPassword("");
    setEmail("");
  };

  if (loginStatus) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Welcome, {username}!
        </Typography>
        <Button
          variant="contained"
          onClick={handleSignOut}
          sx={{ mt: 2 }}
        >
          Sign Out
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {isRegistering ? "Create Account" : "Sign In"}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 400 }}>
        <TextField
          fullWidth
          label="Username"
          variant="outlined"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          variant="outlined"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2 }}
        />
        {isRegistering && (
          <TextField
            fullWidth
            label="Email"
            type="email"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
        )}
        <Button
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 2 }}
        >
          {isRegistering ? "Create Account" : "Sign In"}
        </Button>
        <Button
          variant="text"
          fullWidth
          sx={{ mt: 2 }}
          onClick={() => setIsRegistering(!isRegistering)}
        >
          {isRegistering ? "Already have an account? Sign In" : "Need an account? Register"}
        </Button>
      </Box>
    </Box>
  );
} 