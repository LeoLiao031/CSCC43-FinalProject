"use client";
import { Box, Typography, TextField, Button, Alert, Divider, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Accordion, AccordionSummary, AccordionDetails, MenuItem, Select, FormControl, InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material";
import { useState, useEffect } from "react";
import { createPortfolio, deletePortfolio, getPortfolios, depositCash, transferCash, withdrawCash, buyStock, sellStock, getPortfolioInfo, getStockHistory, getStockPrediction } from "../../../endpoints/api";
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import RemoveIcon from '@mui/icons-material/Remove';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TableChartIcon from '@mui/icons-material/TableChart';
import TimelineIcon from '@mui/icons-material/Timeline';

interface PortfolioTabProps {
  loginStatus: boolean;
  username: string;
  userId: number;
}

interface StockHolding {
  stock_symbol: string | null;
  quantity: number | null;
  close_price: number | null;
  stock_value: number | null;
}

interface Portfolio {
  port_id: number;
  port_name: string;
  cash_dep: number;
  stocks_value: number;
  total_value: number;
  stock_holdings: StockHolding[];
}

interface StockHistoryData {
  timestamp: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
}

interface StockPrediction {
  stock_symbol: string;
  movingAverage: number;
  historicalData: {
    date: string;
    close_price: number;
  }[];
}

export default function PortfolioTab({ loginStatus, username, userId }: PortfolioTabProps) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [initialDeposit, setInitialDeposit] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedPortfolioForDeposit, setSelectedPortfolioForDeposit] = useState<Portfolio | null>(null);
  const [selectedPortfolioForTransfer, setSelectedPortfolioForTransfer] = useState<Portfolio | null>(null);
  const [selectedPortfolioForWithdraw, setSelectedPortfolioForWithdraw] = useState<Portfolio | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [targetPortfolio, setTargetPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPortfolioForBuy, setSelectedPortfolioForBuy] = useState<Portfolio | null>(null);
  const [selectedPortfolioForSell, setSelectedPortfolioForSell] = useState<Portfolio | null>(null);
  const [buyStockSymbol, setBuyStockSymbol] = useState("");
  const [buyQuantity, setBuyQuantity] = useState("");
  const [sellStockSymbol, setSellStockSymbol] = useState("");
  const [sellQuantity, setSellQuantity] = useState("");
  const [expandedPortfolio, setExpandedPortfolio] = useState<number | null>(null);
  const [detailedPortfolios, setDetailedPortfolios] = useState<{ [key: number]: Portfolio }>({});
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; portfolioId: number } | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistoryData[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isLoadingStockHistory, setIsLoadingStockHistory] = useState(false);
  const [selectedStockForPrediction, setSelectedStockForPrediction] = useState<{ symbol: string; portfolioId: number } | null>(null);
  const [stockPrediction, setStockPrediction] = useState<StockPrediction | null>(null);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [predictionPeriod, setPredictionPeriod] = useState<number>(7);

  useEffect(() => {
    if (loginStatus && username) {
      fetchPortfolios();
    }
  }, [loginStatus, username]);

  const fetchPortfolios = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await getPortfolios(userId);
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
      const response = await createPortfolio(newPortfolioName, depositAmount, userId);
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
      const response = await deletePortfolio(portfolioName, userId);
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

  const handleDeposit = async (portfolioId: number) => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid deposit amount");
      return;
    }

    try {
      const response = await depositCash(portfolioId, userId, amount);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess(`Successfully deposited $${amount}`);
      setDepositAmount("");
      setSelectedPortfolioForDeposit(null);
      fetchPortfolios();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to deposit cash");
    }
  };

  const handleWithdraw = async (portfolioId: number) => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid withdrawal amount");
      return;
    }

    try {
      const response = await withdrawCash(portfolioId, userId, amount);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess(`Successfully withdrew $${amount}`);
      setWithdrawAmount("");
      setSelectedPortfolioForWithdraw(null);
      fetchPortfolios();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to withdraw cash");
    }
  };

  const handleTransfer = async () => {
    if (!selectedPortfolioForTransfer) return;

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
        selectedPortfolioForTransfer.port_id,
        targetPortfolio.port_id,
        userId,
        amount
      );
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess(`Successfully transferred $${amount} to ${targetPortfolio.port_name}`);
      setTransferAmount("");
      setTargetPortfolio(null);
      setTransferDialogOpen(false);
      setSelectedPortfolioForTransfer(null);
      fetchPortfolios();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to transfer cash");
    }
  };

  const handleBuyStock = async (portfolioId: number) => {
    const quantity = parseInt(buyQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      setError("Please enter a valid quantity");
      return;
    }

    if (!buyStockSymbol.trim()) {
      setError("Please enter a valid stock symbol");
      return;
    }

    try {
      const response = await buyStock(portfolioId, buyStockSymbol, quantity, userId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess(`Successfully bought ${quantity} shares of ${buyStockSymbol}`);
      setBuyStockSymbol("");
      setBuyQuantity("");
      setSelectedPortfolioForBuy(null);
      await fetchDetailedPortfolio(portfolioId);
      fetchPortfolios();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to buy stock");
    }
  };

  const handleSellStock = async (portfolioId: number) => {
    const quantity = parseInt(sellQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      setError("Please enter a valid quantity");
      return;
    }

    if (!sellStockSymbol.trim()) {
      setError("Please enter a valid stock symbol");
      return;
    }

    try {
      const response = await sellStock(portfolioId, sellStockSymbol, quantity, userId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setSuccess(`Successfully sold ${quantity} shares of ${sellStockSymbol}`);
      setSellStockSymbol("");
      setSellQuantity("");
      setSelectedPortfolioForSell(null);
      await fetchDetailedPortfolio(portfolioId);
      fetchPortfolios();
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to sell stock");
    }
  };

  const fetchDetailedPortfolio = async (portfolioId: number) => {
    try {
      const response = await getPortfolioInfo(portfolioId, userId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setDetailedPortfolios(prev => ({
        ...prev,
        [portfolioId]: response
      }));
    } catch (error) {
      console.error('Error fetching detailed portfolio:', error);
      setError("Failed to fetch portfolio details");
    }
  };

  const handleAccordionChange = (portfolioId: number) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPortfolio(isExpanded ? portfolioId : null);
    if (isExpanded && !detailedPortfolios[portfolioId]) {
      fetchDetailedPortfolio(portfolioId);
    }
  };

  const handleOpenStockDialog = (symbol: string, portfolioId: number) => {
    setSelectedStock({ symbol, portfolioId });
    setStartDate("");
    setEndDate("");
    setStockHistory([]);
  };

  const handleCloseStockDialog = () => {
    setSelectedStock(null);
    setStartDate("");
    setEndDate("");
    setStockHistory([]);
  };

  const handleFetchStockHistory = async () => {
    if (!selectedStock || !startDate || !endDate) return;

    setIsLoadingStockHistory(true);
    try {
      const response = await getStockHistory(selectedStock.symbol, startDate, endDate);
      if (response.error) {
        setError(response.error);
        return;
      }
      setStockHistory(response || []);
    } catch (error) {
      console.error('Error fetching stock history:', error);
      setError("Failed to fetch stock history");
    } finally {
      setIsLoadingStockHistory(false);
    }
  };

  const handleOpenPredictionDialog = (symbol: string, portfolioId: number) => {
    setSelectedStockForPrediction({ symbol, portfolioId });
    setStockPrediction(null);
  };

  const handleClosePredictionDialog = () => {
    setSelectedStockForPrediction(null);
    setStockPrediction(null);
  };

  const handleFetchPrediction = async () => {
    if (!selectedStockForPrediction) return;

    setIsLoadingPrediction(true);
    try {
      const response = await getStockPrediction(selectedStockForPrediction.symbol, predictionPeriod);
      if (response.error) {
        setError(response.error);
        return;
      }
      setStockPrediction(response);
    } catch (error) {
      console.error('Error fetching stock prediction:', error);
      setError("Failed to fetch stock prediction");
    } finally {
      setIsLoadingPrediction(false);
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
                    onClick={() => setSelectedPortfolioForDeposit(portfolio)}
                  >
                    <AddIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setSelectedPortfolioForWithdraw(portfolio)}
                  >
                    <RemoveIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedPortfolioForTransfer(portfolio);
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
                expanded={expandedPortfolio === portfolio.port_id}
                onChange={handleAccordionChange(portfolio.port_id)}
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
                        Stocks Value: ${portfolio.stocks_value}
                      </Typography>
                      <Typography variant="body2">
                        Total Value: ${portfolio.total_value}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Stock Holdings:
                        </Typography>
                        {detailedPortfolios[portfolio.port_id]?.stock_holdings?.length > 0 ? (
                          detailedPortfolios[portfolio.port_id].stock_holdings.map((holding, index) => (
                            holding.stock_symbol && (
                              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <Typography variant="body2">
                                  {holding.stock_symbol}: {holding.quantity} shares @ ${holding.close_price} (${holding.stock_value})
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenStockDialog(holding.stock_symbol || "", portfolio.port_id)}
                                  >
                                    <TableChartIcon />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenPredictionDialog(holding.stock_symbol || "", portfolio.port_id)}
                                  >
                                    <TimelineIcon />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setSelectedPortfolioForSell(portfolio);
                                      setSellStockSymbol(holding.stock_symbol || "");
                                    }}
                                  >
                                    <TrendingDownIcon />
                                  </IconButton>
                                </Box>
                              </Box>
                            )
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No stocks in this portfolio
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <Button
                          variant="contained"
                          startIcon={<TrendingUpIcon />}
                          onClick={() => setSelectedPortfolioForBuy(portfolio)}
                        >
                          Buy Stock
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          ))}
        </Box>
      )}

      {/* Deposit Dialog */}
      {selectedPortfolioForDeposit && (
        <Dialog open={!!selectedPortfolioForDeposit} onClose={() => setSelectedPortfolioForDeposit(null)}>
          <DialogTitle>Deposit to {selectedPortfolioForDeposit.port_name}</DialogTitle>
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
            <Button onClick={() => setSelectedPortfolioForDeposit(null)}>Cancel</Button>
            <Button onClick={() => handleDeposit(selectedPortfolioForDeposit.port_id)}>Deposit</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Withdraw Dialog */}
      {selectedPortfolioForWithdraw && (
        <Dialog open={!!selectedPortfolioForWithdraw} onClose={() => setSelectedPortfolioForWithdraw(null)}>
          <DialogTitle>Withdraw from {selectedPortfolioForWithdraw.port_name}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Amount"
              type="number"
              fullWidth
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedPortfolioForWithdraw(null)}>Cancel</Button>
            <Button onClick={() => handleWithdraw(selectedPortfolioForWithdraw.port_id)}>Withdraw</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onClose={() => {
        setTransferDialogOpen(false);
        setSelectedPortfolioForTransfer(null);
      }}>
        <DialogTitle>Transfer from {selectedPortfolioForTransfer?.port_name}</DialogTitle>
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
          <FormControl fullWidth margin="dense">
            <InputLabel>Target Portfolio</InputLabel>
            <Select
              value={targetPortfolio?.port_id || ''}
              label="Target Portfolio"
              onChange={(e) => {
                const selectedId = e.target.value;
                const selectedPortfolio = portfolios.find(p => p.port_id === selectedId);
                setTargetPortfolio(selectedPortfolio || null);
              }}
            >
              {portfolios
                .filter(portfolio => portfolio.port_id !== selectedPortfolioForTransfer?.port_id)
                .map(portfolio => (
                  <MenuItem key={portfolio.port_id} value={portfolio.port_id}>
                    {portfolio.port_name} (${portfolio.cash_dep})
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setTransferDialogOpen(false);
            setSelectedPortfolioForTransfer(null);
            setTargetPortfolio(null);
          }}>Cancel</Button>
          <Button onClick={handleTransfer}>Transfer</Button>
        </DialogActions>
      </Dialog>

      {/* Buy Stock Dialog */}
      {selectedPortfolioForBuy && (
        <Dialog open={!!selectedPortfolioForBuy} onClose={() => setSelectedPortfolioForBuy(null)}>
          <DialogTitle>Buy Stock for {selectedPortfolioForBuy.port_name}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Stock Symbol"
              fullWidth
              value={buyStockSymbol}
              onChange={(e) => setBuyStockSymbol(e.target.value.toUpperCase())}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Quantity"
              type="number"
              fullWidth
              value={buyQuantity}
              onChange={(e) => setBuyQuantity(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedPortfolioForBuy(null)}>Cancel</Button>
            <Button onClick={() => handleBuyStock(selectedPortfolioForBuy.port_id)}>Buy</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Sell Stock Dialog */}
      {selectedPortfolioForSell && (
        <Dialog open={!!selectedPortfolioForSell} onClose={() => setSelectedPortfolioForSell(null)}>
          <DialogTitle>Sell Stock from {selectedPortfolioForSell.port_name}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Stock Symbol"
              fullWidth
              value={sellStockSymbol}
              onChange={(e) => setSellStockSymbol(e.target.value.toUpperCase())}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Quantity"
              type="number"
              fullWidth
              value={sellQuantity}
              onChange={(e) => setSellQuantity(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedPortfolioForSell(null)}>Cancel</Button>
            <Button onClick={() => handleSellStock(selectedPortfolioForSell.port_id)}>Sell</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Stock History Dialog */}
      <Dialog 
        open={!!selectedStock} 
        onClose={handleCloseStockDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Stock History for {selectedStock?.symbol}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, mb: 2, display: 'flex', gap: 2 }}>
            <TextField
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
          </Box>
          {isLoadingStockHistory ? (
            <Typography>Loading stock history...</Typography>
          ) : stockHistory.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Open</TableCell>
                    <TableCell align="right">High</TableCell>
                    <TableCell align="right">Low</TableCell>
                    <TableCell align="right">Close</TableCell>
                    <TableCell align="right">Volume</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stockHistory.map((data, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(data.timestamp).toLocaleDateString()}</TableCell>
                      <TableCell align="right">${data.open_price}</TableCell>
                      <TableCell align="right">${data.high_price}</TableCell>
                      <TableCell align="right">${data.low_price}</TableCell>
                      <TableCell align="right">${data.close_price}</TableCell>
                      <TableCell align="right">{data.volume}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : startDate && endDate ? (
            <Typography>No data available for the selected date range</Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStockDialog}>Close</Button>
          <Button 
            onClick={handleFetchStockHistory}
            variant="contained"
            disabled={!startDate || !endDate || isLoadingStockHistory}
          >
            Fetch History
          </Button>
        </DialogActions>
      </Dialog>

      {/* Prediction Dialog */}
      <Dialog 
        open={!!selectedStockForPrediction} 
        onClose={handleClosePredictionDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Price Prediction for {selectedStockForPrediction?.symbol}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, mb: 2 }}>
            <TextField
              type="number"
              label="Moving Average Period (days)"
              value={predictionPeriod}
              onChange={(e) => setPredictionPeriod(Math.max(1, parseInt(e.target.value) || 7))}
              inputProps={{ min: 1 }}
              sx={{ width: '100%' }}
            />
          </Box>
          {isLoadingPrediction ? (
            <Typography>Calculating prediction...</Typography>
          ) : stockPrediction ? (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Moving Average Prediction: ${stockPrediction.movingAverage.toFixed(2)}
              </Typography>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Historical Data:
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Close Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stockPrediction.historicalData.map((data, index) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(data.date).toLocaleDateString()}</TableCell>
                        <TableCell align="right">${data.close_price}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePredictionDialog}>Close</Button>
          <Button 
            onClick={handleFetchPrediction}
            variant="contained"
            disabled={isLoadingPrediction}
          >
            Calculate Prediction
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 