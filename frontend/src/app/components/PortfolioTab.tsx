"use client";
import { Box, Typography, TextField, Button, Alert, Divider, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import { useState, useEffect } from "react";
import { createPortfolio, deletePortfolio, getPortfolios, depositCash, transferCash } from "../../../endpoints/api";
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface PortfolioTabProps {
  loginStatus: boolean;
  username: string;
}

interface Portfolio {
  port_name: string;
  cash_dep: number;
  username: string;
}

export default function PortfolioTab({ loginStatus, username }: PortfolioTabProps) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [initialDeposit, setInitialDeposit] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [targetPortfolio, setTargetPortfolio] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (loginStatus && username) {
      fetchPortfolios();
    }
  }, [loginStatus, username]);

  const fetchPortfolios = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await getPortfolios(username);
      if (response.error) {
        setError(response.error);
        return;
      }
      setPortfolios(response || []);
    } catch (error) {
      console.error('Error fetching portfolios:', error);
      setError("Failed to fetch portfolios. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newPortfolioName.trim()) {
      setError("Portfolio name cannot be empty");
      return;
    }

    const depositAmount = parseFloat(initialDeposit);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setError("Please enter a valid deposit amount");
      return;
    }

    try {
      const response = await createPortfolio(newPortfolioName, depositAmount, username);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess("Portfolio created successfully!");
      setNewPortfolioName("");
      setInitialDeposit("");
      fetchPortfolios();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to create portfolio. Please try again.");
    }
  };

  const handleDeletePortfolio = async (portfolioName: string) => {
    try {
      const response = await deletePortfolio(portfolioName, username);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess("Portfolio deleted successfully!");
      fetchPortfolios();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to delete portfolio");
    }
  };

  const handleDeposit = async (portfolioName: string) => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid deposit amount");
      return;
    }

    try {
      const response = await depositCash(portfolioName, username, amount);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess(`Successfully deposited $${amount} into ${portfolioName}`);
      setDepositAmount("");
      setSelectedPortfolio(null);
      fetchPortfolios();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to deposit cash");
    }
  };

  const handleTransfer = async () => {
    if (!selectedPortfolio) return;

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid transfer amount");
      return;
    }

    if (!targetPortfolio) {
      setError("Please select a target portfolio");
      return;
    }

    try {
      const response = await transferCash(
        selectedPortfolio.port_name,
        targetPortfolio,
        username,
        amount
      );
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess(`Successfully transferred $${amount} to ${targetPortfolio}`);
      setTransferAmount("");
      setTargetPortfolio("");
      setTransferDialogOpen(false);
      fetchPortfolios();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to transfer cash");
    }
  };

  if (!loginStatus) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Please sign in to view and manage your portfolios
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Your Portfolios
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

      <Box component="form" onSubmit={handleCreatePortfolio} sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Create New Portfolio
        </Typography>
        <TextField
          fullWidth
          label="Portfolio Name"
          variant="outlined"
          value={newPortfolioName}
          onChange={(e) => setNewPortfolioName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Initial Deposit"
          type="number"
          variant="outlined"
          value={initialDeposit}
          onChange={(e) => setInitialDeposit(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 2 }}
        >
          Create Portfolio
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" sx={{ mb: 2 }}>
        Your Existing Portfolios
      </Typography>

      {isLoading ? (
        <Typography>Loading portfolios...</Typography>
      ) : portfolios.length === 0 ? (
        <Typography>
          You don&apos;t have any portfolios yet. Create one above!
        </Typography>
      ) : (
        <Box sx={{ width: '100%' }}>
          {portfolios.map((portfolio) => (
            <Box key={portfolio.port_name} sx={{ mb: 2 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                p: 2,
                borderRadius: 1,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6">{portfolio.port_name}</Typography>
                  <Typography variant="body1" color="text.secondary">
                    Balance: ${portfolio.cash_dep}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => setSelectedPortfolio(portfolio)}
                  >
                    <AddIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedPortfolio(portfolio);
                      setTransferDialogOpen(true);
                    }}
                  >
                    <SwapHorizIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeletePortfolio(portfolio.port_name)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
              <Accordion
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
                  <Typography variant="body1">View Details</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      Portfolio Details
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Typography variant="body2">
                        Portfolio Name: {portfolio.port_name}
                      </Typography>
                      <Typography variant="body2">
                        Current Balance: ${portfolio.cash_dep}
                      </Typography>
                      <Typography variant="body2">
                        Owner: {portfolio.username}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          ))}
        </Box>
      )}

      {/* Deposit Dialog */}
      {selectedPortfolio && (
        <Dialog open={!!selectedPortfolio} onClose={() => setSelectedPortfolio(null)}>
          <DialogTitle>Deposit to {selectedPortfolio.port_name}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Amount"
              type="number"
              fullWidth
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedPortfolio(null)}>Cancel</Button>
            <Button onClick={() => handleDeposit(selectedPortfolio.port_name)}>Deposit</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)}>
        <DialogTitle>Transfer from {selectedPortfolio?.port_name}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Amount"
            type="number"
            fullWidth
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Target Portfolio"
            fullWidth
            value={targetPortfolio}
            onChange={(e) => setTargetPortfolio(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleTransfer}>Transfer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 