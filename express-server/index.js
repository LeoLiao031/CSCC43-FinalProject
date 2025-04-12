const express = require("express");
const pool = require("./db"); // we'll create this file next
const cors = require("cors");
const app = express();

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000', // Frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });  

// -- User management --

// Create a user *
app.post("/users", async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO Users (username, password, email)
       VALUES ($1, $2, $3)
       RETURNING id, username, reg_date`,
      [username, password, email]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "User creation failed" });
  }
});

// Get user by username *
app.get("/users/:username", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM Users WHERE username = $1 LIMIT 1`,
      [req.params.username]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch user" });
  }
});

// Search for usernames *
app.get("/users/search/:query", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT username, email FROM Users WHERE username ILIKE $1`, // edit for needed fields 
      [`${req.params.query}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

// -- Portfolio management --

// Create a portfolio *
app.post("/portfolios", async (req, res) => {
  const { port_name, cash_dep, user_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO Portfolios (port_name, cash_dep, user_id)
       SELECT $1, $2, $3
       WHERE NOT EXISTS (SELECT 1 FROM Portfolios WHERE port_name = $1 AND user_id = $3)
       RETURNING port_name, cash_dep, user_id`,
      [port_name, cash_dep, user_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Portfolio creation failed" });
  }
});

// Delete a portfolio *
app.delete("/portfolios", async (req, res) => {
  const { port_name, user_id } = req.body;
  try {
    const result = await pool.query(
      `DELETE FROM Portfolios 
       WHERE port_name = $1 AND user_id = $2`,
      [port_name, user_id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Portfolio not found" });
    }
    res.json({ message: "Portfolio deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete portfolio" });
  }
});

// Get all portfolios for a user with market value *
app.get("/portfolios/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
         p.port_id,
         p.port_name,
         p.cash_dep,
         COALESCE(SUM(sh.quantity * (
           SELECT close_price
           FROM StockHistory
           WHERE StockHistory.stock_symbol = sh.stock_symbol
           ORDER BY timestamp DESC
           LIMIT 1
         )), 0) AS stocks_value,
         p.cash_dep + COALESCE(SUM(sh.quantity * (
           SELECT close_price
           FROM StockHistory
           WHERE StockHistory.stock_symbol = sh.stock_symbol
           ORDER BY timestamp DESC
           LIMIT 1
         )), 0) AS total_value
       FROM Portfolios p
       LEFT JOIN Stockholdings sh ON p.port_id = sh.port_id
       WHERE p.user_id = $1
       GROUP BY p.port_id, p.port_name, p.cash_dep`,
      [user_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch portfolios" });
  }
});

// Get performance for a portfolio *
app.get("/portfolios/:port_id/performance", async (req, res) => {
  const { port_id } = req.params;

  // Validate port_id
  if (isNaN(port_id)) {
    return res.status(400).json({ error: "Invalid portfolio ID" });
  }

  try {
    // Verify portfolio ownership
    const portfolioCheck = await pool.query(
      `SELECT port_id 
       FROM Portfolios 
       WHERE port_id = $1`,
      [port_id]
    );

    if (portfolioCheck.rows.length === 0) {
      return res.status(404).json({ error: "Portfolio not found" });
    }

    // Fetch the latest stock prices and portfolio holdings
    const portfolioHoldings = await pool.query(
      `WITH recent_prices AS (
         SELECT stock_symbol, close_price, timestamp
         FROM StockHistory
         WHERE (stock_symbol, timestamp) IN (
           SELECT stock_symbol, MAX(timestamp)
           FROM StockHistory
           GROUP BY stock_symbol
         )
       )
       SELECT 
         sh.stock_symbol,
         sh.quantity,
         COALESCE(rp.close_price, 0) AS current_price,
         (sh.quantity * COALESCE(rp.close_price, 0)) AS stock_value
       FROM Stockholdings sh
       LEFT JOIN recent_prices rp ON sh.stock_symbol = rp.stock_symbol
       WHERE sh.port_id = $1`,
      [port_id]
    );

    const holdings = portfolioHoldings.rows;

    // Handle empty holdings
    if (holdings.length === 0) {
      return res.json({
        portfolioId: port_id,
        totalStocksValue: 0,
        holdings: [],
        historicalData: [],
      });
    }

    // Calculate total portfolio value
    const totalStocksValue = holdings.reduce((sum, stock) => sum + stock.stock_value, 0);

    res.json({
      portfolioId: port_id,
      totalStocksValue,
      holdings,
    });
  } catch (err) {
    console.error("Error fetching portfolio performance:", err);
    res.status(500).json({ error: "Failed to fetch portfolio performance statistics" });
  }
});

// Get portfolio statistics
app.get("/portfolios/:port_id/statistics", async (req, res) => {
  const { port_id } = req.params;
  const { start_date, end_date } = req.query;

  try {
    // Validate portfolio existence
    const portfolioCheck = await pool.query(
      `SELECT port_id 
       FROM Portfolios 
       WHERE port_id = $1`,
      [port_id]
    );

    if (portfolioCheck.rows.length === 0) {
      return res.status(404).json({ error: "Portfolio not found" });
    }

    // Fetch portfolio stock holdings
    const stockHoldings = await pool.query(
      `SELECT sh.stock_symbol, sh.quantity
       FROM Stockholdings sh
       WHERE sh.port_id = $1`,
      [port_id]
    );

    if (stockHoldings.rows.length === 0) {
      return res.status(404).json({ error: "No stocks found in the portfolio" });
    }

    const stockSymbols = stockHoldings.rows.map((row) => row.stock_symbol);

    // Calculate Coefficient of Variation and Beta for Each Stock
    const stockStatisticsQuery = `
      WITH StockReturns AS (
        SELECT 
            s.stock_symbol,
            s.timestamp,
            (s.close_price - LAG(s.close_price) OVER (PARTITION BY s.stock_symbol ORDER BY s.timestamp)) /
            LAG(s.close_price) OVER (PARTITION BY s.stock_symbol ORDER BY s.timestamp) AS stock_return
        FROM StockHistory s
        WHERE s.stock_symbol = ANY($1::text[])
          AND s.timestamp BETWEEN $2 AND $3
      ),
      MarketReturns AS (
        SELECT 
            s.timestamp,
            AVG(s.close_price) AS market_price,
            (AVG(s.close_price) - LAG(AVG(s.close_price)) OVER (ORDER BY s.timestamp)) /
            LAG(AVG(s.close_price)) OVER (ORDER BY s.timestamp) AS market_return
        FROM StockHistory s
        WHERE s.stock_symbol = ANY($1::text[])
          AND s.timestamp BETWEEN $2 AND $3
        GROUP BY s.timestamp
      )
      SELECT 
          sr.stock_symbol,
          STDDEV(sr.stock_return) / AVG(ABS(sr.stock_return)) AS coefficient_of_variation,
          COVAR_SAMP(sr.stock_return, mr.market_return) / VAR_SAMP(mr.market_return) AS beta
      FROM StockReturns sr
      JOIN MarketReturns mr ON sr.timestamp = mr.timestamp
      GROUP BY sr.stock_symbol;
    `;

    const stockStatisticsResult = await pool.query(stockStatisticsQuery, [
      stockSymbols,
      start_date || "2015-01-01",
      end_date || new Date().toISOString(),
    ]);

    const stockStatistics = stockStatisticsResult.rows;

    // Calculate Covariance and Correlation Matrix
    const covarianceCorrelationQuery = `
      WITH StockReturns AS (
        SELECT 
            s.stock_symbol,
            s.timestamp,
            (s.close_price - LAG(s.close_price) OVER (PARTITION BY s.stock_symbol ORDER BY s.timestamp)) /
            LAG(s.close_price) OVER (PARTITION BY s.stock_symbol ORDER BY s.timestamp) AS stock_return
        FROM StockHistory s
        WHERE s.stock_symbol = ANY($1::text[])
          AND s.timestamp BETWEEN $2 AND $3
      ),
      CombinedData AS (
        SELECT
            sr1.stock_symbol AS stock1,
            sr2.stock_symbol AS stock2,
            sr1.stock_return AS return1,
            sr2.stock_return AS return2
        FROM StockReturns sr1
        JOIN StockReturns sr2
          ON sr1.timestamp = sr2.timestamp
        WHERE sr1.stock_symbol = ANY($1::text[])
          AND sr2.stock_symbol = ANY($1::text[])
      )
      SELECT
          cd.stock1,
          cd.stock2,
          COVAR_SAMP(cd.return1, cd.return2) AS covariance,
          CORR(cd.return1, cd.return2) AS correlation
      FROM CombinedData cd
      GROUP BY cd.stock1, cd.stock2;
    `;

    const covarianceCorrelationResult = await pool.query(covarianceCorrelationQuery, [
      stockSymbols,
      start_date || "1970-01-01",
      end_date || new Date().toISOString(),
    ]);

    const covarianceCorrelationMatrix = covarianceCorrelationResult.rows;

    // Return the results
    res.json({
      portfolioId: port_id,
      stockStatistics,
      covarianceCorrelationMatrix,
    });
  } catch (err) {
    console.error("Error fetching portfolio statistics:", err.message, err.stack);
    res.status(500).json({ error: "Failed to fetch portfolio statistics" });
  }
});

// Get portfolio info with detailed stock holdings and market value *
app.get("/portfolios/:port_id/:user_id", async (req, res) => {
  const { port_id, user_id } = req.params;

  try {
    const result = await pool.query(
      `WITH latest_prices AS (
         SELECT stock_symbol, close_price
         FROM StockHistory
         WHERE (stock_symbol, timestamp) IN (
           SELECT stock_symbol, MAX(timestamp)
           FROM StockHistory
           GROUP BY stock_symbol
         )
       )
       SELECT 
         p.port_id,
         p.port_name,
         p.cash_dep,
         COALESCE(SUM(sh.quantity * lp.close_price), 0) AS stocks_value,
         p.cash_dep + COALESCE(SUM(sh.quantity * lp.close_price), 0) AS total_value,
         json_agg(
           json_build_object(
             'stock_symbol', sh.stock_symbol,
             'quantity', sh.quantity,
             'close_price', lp.close_price,
             'stock_value', sh.quantity * lp.close_price
           )
         ) AS stock_holdings
       FROM Portfolios p
       LEFT JOIN StockHoldings sh ON p.port_id = sh.port_id
       LEFT JOIN latest_prices lp ON sh.stock_symbol = lp.stock_symbol
       WHERE p.port_id = $1 AND p.user_id = $2
       GROUP BY p.port_id, p.port_name, p.cash_dep`,
      [port_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Portfolio not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch portfolio info" });
  }
});

// Deposit cash into portfolio *
app.put("/portfolios/deposit", async (req, res) => {
  const { port_id, user_id, amount } = req.body; // Changed port_name to port_id
  try {
    // Check if the user is the owner of the portfolio
    const ownershipCheck = await pool.query(
      `SELECT port_id, user_id 
       FROM Portfolios 
       WHERE port_id = $1 AND user_id = $2`, // Changed condition to use port_id
      [port_id, user_id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ error: "You are not the owner of this portfolio or it does not exist" });
    }

    // Update the portfolio's cash balance
    const result = await pool.query(
      `UPDATE Portfolios
       SET cash_dep = cash_dep + $1
       WHERE port_id = $2
       RETURNING port_id, port_name, cash_dep, user_id`,
      [amount, port_id]
    );

    // Record the deposit in the Records table
    await pool.query(
      `INSERT INTO Records (port_id, record_type, amount, date)
       VALUES ($1, 'DEPOSIT', $2, CURRENT_DATE)`,
      [port_id, amount]
    );

    res.json({ message: "Deposit successful", portfolio: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to deposit cash" });
  }
});

// Withdraw cash from portfolio *
app.put("/portfolios/withdraw", async (req, res) => {
  const { port_id, user_id, amount } = req.body; // Changed port_name to port_id
  try {
    // Check if the user is the owner of the portfolio
    const ownershipCheck = await pool.query(
      `SELECT port_id, user_id 
       FROM Portfolios 
       WHERE port_id = $1 AND user_id = $2`, // Changed condition to use port_id
      [port_id, user_id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ error: "You are not the owner of this portfolio or it does not exist" });
    }

    // Update the portfolio's cash balance down
    const result = await pool.query(
      `UPDATE Portfolios
       SET cash_dep = cash_dep - $1
       WHERE port_id = $2
       RETURNING port_id, port_name, cash_dep, user_id`,
      [amount, port_id]
    );

    if (result.rows[0].cash_dep < 0) {
    // Update the portfolio's cash balance back up
    await pool.query(
        `UPDATE Portfolios
        SET cash_dep = cash_dep + $1
        WHERE port_id = $2`,
        [amount, port_id]
        );
      return res.status(400).json({ error: "Insufficient funds in portfolio" });
    }

    // Record the withdrawal in the Records table
    await pool.query(
      `INSERT INTO Records (port_id, record_type, amount, date)
       VALUES ($1, 'WITHDRAW', $2, CURRENT_DATE)`,
      [port_id, amount]
    );

    res.json({ message: "Withdrawal successful", portfolio: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to withdraw cash" });
  }
});

// Transfer cash between portfolios *
app.put("/portfolios/transfer", async (req, res) => {
  const { give_port_id, get_port_id, owner, amount } = req.body;

  try {
    // Start a transaction
    await pool.query("BEGIN");

    // Deduct cash from the giving portfolio
    const deductResult = await pool.query(
      `UPDATE Portfolios
       SET cash_dep = cash_dep - $1
       WHERE port_id = $2 AND user_id = $3
       RETURNING port_id, port_name, cash_dep`,
      [amount, give_port_id, owner]
    );

    if (deductResult.rowCount === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Giving portfolio not found or insufficient funds" });
    }

    if (deductResult.rows[0].cash_dep < 0) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ error: "Insufficient funds in the giving portfolio" });
    }

    // Add cash to the receiving portfolio
    const addResult = await pool.query(
      `UPDATE Portfolios
       SET cash_dep = cash_dep + $1
       WHERE port_id = $2 AND user_id = $3
       RETURNING port_id, port_name, cash_dep`,
      [amount, get_port_id, owner]
    );

    if (addResult.rowCount === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Receiving portfolio not found" });
    }

    // Log the transfer in the Records table for the giving portfolio
    await pool.query(
      `INSERT INTO Records (port_id, record_type, amount, date)
       VALUES ($1, 'TRANSFER_OUT', $2, CURRENT_DATE)`,
      [give_port_id, amount]
    );

    // Log the transfer in the Records table for the receiving portfolio
    await pool.query(
      `INSERT INTO Records (port_id, record_type, amount, date)
       VALUES ($1, 'TRANSFER_IN', $2, CURRENT_DATE)`,
      [get_port_id, amount]
    );

    // Commit the transaction
    await pool.query("COMMIT");

    res.json({
      message: "Transfer successful",
      from: deductResult.rows[0],
      to: addResult.rows[0],
    });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to transfer cash" });
  }
});

// -- Stock management --

// Buy a stock for a portfolio *
app.post("/portfolios/stocks/buy", async (req, res) => {
  const { port_id, stock_symbol, amount, user_id } = req.body;

  try {
    // Check if the user is the owner of the portfolio
    const ownershipCheck = await pool.query(
      `SELECT port_id, user_id 
       FROM Portfolios 
       WHERE port_id = $1 AND user_id = $2`,
      [port_id, user_id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ error: "You are not the owner of this portfolio or it does not exist" });
    }

    // Check if the stock exists
    const stockCheckResult = await pool.query(
      `SELECT stock_symbol FROM Stocks WHERE stock_symbol = $1`,
      [stock_symbol]
    );

    if (stockCheckResult.rows.length === 0) {
      return res.status(404).json({ error: "Stock not found" });
    }

    // Get the close price of the stock
    const priceResult = await pool.query(
      `SELECT close_price
       FROM StockHistory
       WHERE stock_symbol = $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [stock_symbol]
    );

    if (priceResult.rows.length === 0) {
      return res.status(404).json({ error: "Stock price not found" });
    }

    const close_price = priceResult.rows[0].close_price;
    const total_cost = close_price * amount;

    // Check if the portfolio has enough cash
    const portfolioResult = await pool.query(
      `SELECT cash_dep
       FROM Portfolios
       WHERE port_id = $1`,
      [port_id]
    );

    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({ error: "Portfolio not found" });
    }

    const cash_dep = portfolioResult.rows[0].cash_dep;

    if (cash_dep < total_cost) {
      return res.status(400).json({ error: "Insufficient cash in portfolio" });
    }

    // Deduct the total cost from the portfolio's cash
    await pool.query(
      `UPDATE Portfolios
       SET cash_dep = cash_dep - $1
       WHERE port_id = $2`,
      [total_cost, port_id]
    );

    // Add the stock to the portfolio or update the quantity
    const result = await pool.query(
      `INSERT INTO Stockholdings (port_id, stock_symbol, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (port_id, stock_symbol)
       DO UPDATE SET quantity = Stockholdings.quantity + $3
       RETURNING port_id, stock_symbol, quantity`,
      [port_id, stock_symbol, amount]
    );

    // Record the transaction in the Records table
    await pool.query(
      `INSERT INTO Records (port_id, record_type, amount, date)
       VALUES ($1, 'BUY', $2, CURRENT_DATE)`,
      [port_id, total_cost]
    );

    res.json({
      message: "Stock purchased successfully",
      stock: result.rows[0],
      total_cost,
      remaining_cash: cash_dep - total_cost,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stock purchase failed" });
  }
});

// Sell a stock from a portfolio *
app.delete("/portfolios/stocks/sell", async (req, res) => {
  const { port_id, stock_symbol, amount, user_id } = req.body;

  try {
    // Check if the user is the owner of the portfolio
    const ownershipCheck = await pool.query(
      `SELECT port_id, user_id 
       FROM Portfolios 
       WHERE port_id = $1 AND user_id = $2`,
      [port_id, user_id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ error: "You are not the owner of this portfolio or it does not exist" });
    }

    // Get the close price of the stock
    const priceResult = await pool.query(
      `SELECT close_price
       FROM StockHistory
       WHERE stock_symbol = $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [stock_symbol]
    );

    if (priceResult.rows.length === 0) {
      return res.status(404).json({ error: "Stock price not found" });
    }

    const close_price = priceResult.rows[0].close_price;
    const total_revenue = close_price * amount;

    // Update the stock quantity in the portfolio
    const result = await pool.query(
      `UPDATE Stockholdings
       SET quantity = quantity - $1
       WHERE port_id = $2 AND stock_symbol = $3
       RETURNING port_id, stock_symbol, quantity`,
      [amount, port_id, stock_symbol]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Stock not found in portfolio" });
    }

    if (result.rows[0].quantity < 0) {
      // Rollback the update
      await pool.query(
        `UPDATE Stockholdings
         SET quantity = quantity + $1
         WHERE port_id = $2 AND stock_symbol = $3`,
        [amount, port_id, stock_symbol]
      );
      return res.status(400).json({ error: "Insufficient stock quantity" });
    }
    console.log(result.rows[0].quantity);
    // If quantity is 0, delete the holding
    if (result.rows[0].quantity < 1) {
      await pool.query(
        `DELETE FROM Stockholdings
         WHERE port_id = $1 AND stock_symbol = $2`,
        [port_id, stock_symbol]
      );
    }

    // Add the total revenue to the portfolio's cash
    await pool.query(
      `UPDATE Portfolios
       SET cash_dep = cash_dep + $1
       WHERE port_id = $2`,
      [total_revenue, port_id]
    );

    // Record the transaction in the Records table
    await pool.query(
      `INSERT INTO Records (port_id, record_type, amount, date)
       VALUES ($1, 'SELL', $2, CURRENT_DATE)`,
      [port_id, total_revenue]
    );

    res.json({
      message: "Stock sold successfully",
      stock: result.rows[0],
      total_revenue,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stock sale failed" });
  }
});

// -- Stock History Data --

// Add a new stock to StockHistory (specific timestamp) *
app.post("/stocks", async (req, res) => {
  const { stock_symbol, timestamp, open_price, high_price, low_price, close_price, volume } = req.body;

  try {
    // Check if a stock history record already exists for the given stock symbol and date
    const existingRecord = await pool.query(
      `SELECT history_id 
       FROM StockHistory 
       WHERE stock_symbol = $1 AND DATE(timestamp) = DATE($2)`,
      [stock_symbol, timestamp]
    );

    if (existingRecord.rows.length > 0) {
      return res.status(409).json({ error: "Stock history for this date already exists" });
    }

    // Insert a new stock history record
    const result = await pool.query(
      `INSERT INTO StockHistory (stock_symbol, timestamp, open_price, high_price, low_price, close_price, volume, isHistory)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
       RETURNING history_id, stock_symbol, timestamp, open_price, high_price, low_price, close_price, volume`,
      [stock_symbol, timestamp, open_price, high_price, low_price, close_price, volume]
    );

    res.json({
      message: "Stock history added successfully",
      stockHistory: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add stock history" });
  }
});

// Get stock history entries between a start date and end date *
app.get("/stockhistory", async (req, res) => {
  const { start_date, end_date, stock_symbol } = req.query;

  try {
    // Validate that start_date and end_date are provided
    if (!start_date || !end_date) {
      return res.status(400).json({ error: "start_date and end_date are required" });
    }

    // Base query to fetch stock history
    let query = `
      SELECT *
      FROM StockHistory
      WHERE timestamp BETWEEN $1 AND $2
    `;
    const params = [start_date, end_date];

    // Add filtering by stock_symbol if provided
    if (stock_symbol) {
      query += ` AND stock_symbol = $3`;
      params.push(stock_symbol);
    }

    query += ` ORDER BY timestamp ASC`; // Order results by timestamp

    // Execute the query
    const result = await pool.query(query, params);

    // Return the results
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching stock history:", err.message, err.stack);
    res.status(500).json({ error: "Failed to fetch stock history" });
  }
});

// Get stock data *
app.get("/stocks/:stock_symbol", async (req, res) => {
  const { stock_symbol } = req.params;
  const { date } = req.query; // Optional query parameter for filtering by date

  try {
    let query = `SELECT * FROM StockHistory WHERE stock_symbol = $1`;
    const params = [stock_symbol];

    if (date) {
      query += ` AND DATE(timestamp) = $2`;
      params.push(date);
    }

    query += ` ORDER BY timestamp DESC`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Stock not found" });
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stock data" });
  }
});

// Get all data on a stock *
app.get("/stocks/info/:stock_symbol", async (req, res) => {
  const { stock_symbol } = req.params;
  const { limit = 10, offset = 0 } = req.query; // Pagination parameters with defaults

  try {
    // Fetch stock symbol and company name
    const stockInfo = await pool.query(
      `SELECT s.stock_symbol, s.stock_name
       FROM Stocks s
       WHERE s.stock_symbol = $1`,
      [stock_symbol]
    );

    if (stockInfo.rows.length === 0) {
      return res.status(404).json({ error: "Stock not found" });
    }

    // Fetch the latest stock price
    const latestPrice = await pool.query(
      `SELECT close_price, timestamp
       FROM StockHistory
       WHERE stock_symbol = $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [stock_symbol]
    );

    // Fetch historical stock data with pagination
    const historicalData = await pool.query(
      `SELECT date(timestamp) AS date, open_price, high_price, low_price, close_price, volume
       FROM StockHistory
       WHERE stock_symbol = $1
       ORDER BY timestamp DESC
       LIMIT $2 OFFSET $3`,
      [stock_symbol, parseInt(limit), parseInt(offset)]
    );

    // Fetch total count for pagination
    const totalCount = await pool.query(
      `SELECT COUNT(*)
       FROM StockHistory
       WHERE stock_symbol = $1`,
      [stock_symbol]
    );

    res.json({
      stockInfo: stockInfo.rows[0],
      latestPrice: latestPrice.rows[0] || null,
      historicalData: historicalData.rows,
      totalCount: parseInt(totalCount.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stock data" });
  }
});

// Predict next price (moving average) *
app.get("/stocks/:stock_symbol/predict", async (req, res) => {
  const { stock_symbol } = req.params;
  const { period = 7 } = req.query; // Moving average period (default: 7 days)

  try {
    // Fetch the last `period` days of close prices
    const historicalData = await pool.query(
      `SELECT DATE(timestamp) AS date, close_price
       FROM StockHistory
       WHERE stock_symbol = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [stock_symbol, period]
    );

    if (historicalData.rows.length < period) {
      return res.status(400).json({ error: "Not enough data to calculate moving average" });
    }

    const prices = historicalData.rows.map((row) => parseFloat(row.close_price));
    const movingAverage = prices.reduce((sum, price) => sum + price, 0) / period;

    res.json({
      stock_symbol,
      movingAverage,
      historicalData: historicalData.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to calculate moving average" });
  }
});

// -- Stock Lists --

// Create a new stock list *
app.post("/stocklists", async (req, res) => {
  const { list_name, user_id, visibility } = req.body;

  try {
    // Insert the new stock list
    const result = await pool.query(
      `INSERT INTO StockLists (user_id, name, visibility)
       VALUES ($1, $2, $3)
       RETURNING list_id, name, visibility, created_at`,
      [user_id, list_name, visibility || 'private']
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stock list creation failed" });
  }
});

// Get all public stock lists *
app.get("/stocklists/public", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
        FROM StockLists
        WHERE visibility = 'public'`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch public stock lists" });
  }
});

// Details of Stock List *
app.get("/stocklists/:list_id/details", async (req, res) => {
  const { list_id } = req.params;
  const { user_id } = req.query; // User ID to check access

  try {
    // Verify if the user has access to the stock list
    const accessCheck = await pool.query(
      `SELECT sl.list_id, sl.name AS list_name, sl.visibility, u.username AS creator_name
       FROM StockLists sl
       JOIN Users u ON sl.user_id = u.id
       WHERE sl.list_id = $1
       AND (sl.user_id = $2 OR sl.visibility = 'public' OR EXISTS (
         SELECT 1 FROM Visibility v WHERE v.list_id = sl.list_id AND v.user_id = $2
       ))`,
      [list_id, user_id]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: "You do not have access to this stock list" });
    }

    const stockListDetails = accessCheck.rows[0];

    // Fetch stock items and calculate their statistics
    const stockItems = await pool.query(
      `SELECT 
         sli.stock_symbol,
         sli.quantity,
         s.stock_name,
         COALESCE((
           SELECT sh.close_price
           FROM StockHistory sh
           WHERE sh.stock_symbol = sli.stock_symbol
           ORDER BY sh.timestamp DESC
           LIMIT 1
         ), 0) AS latest_price,
         (sli.quantity * COALESCE((
           SELECT sh.close_price
           FROM StockHistory sh
           WHERE sh.stock_symbol = sli.stock_symbol
           ORDER BY sh.timestamp DESC
           LIMIT 1
         ), 0)) AS stock_value
       FROM StockListStocks sli
       JOIN Stocks s ON sli.stock_symbol = s.stock_symbol
       WHERE sli.list_id = $1`,
      [list_id]
    );

    const stockData = stockItems.rows;

    // Calculate total value of the stock list
    const totalValue = stockData.reduce((sum, stock) => sum + stock.stock_value, 0);

    res.json({
      stockList: stockListDetails,
      totalValue,
      stockItems: stockData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stock list statistics" });
  }
});

// Get stock list statistics
app.get("/stocklists/:list_id/statistics", async (req, res) => {
  const { list_id } = req.params;
  const { start_date, end_date } = req.query;

  try {
    // Validate stock list existence
    const stockListCheck = await pool.query(
      `SELECT list_id, name
       FROM StockLists
       WHERE list_id = $1`,
      [list_id]
    );

    if (stockListCheck.rows.length === 0) {
      return res.status(404).json({ error: "Stock list not found" });
    }

    // Fetch stocks in the stock list
    const stockListStocks = await pool.query(
      `SELECT sli.stock_symbol, sli.quantity
       FROM StockListStocks sli
       WHERE sli.list_id = $1`,
      [list_id]
    );

    if (stockListStocks.rows.length === 0) {
      return res.status(404).json({ error: "No stocks found in the stock list" });
    }

    const stockSymbols = stockListStocks.rows.map((row) => row.stock_symbol);

    // Calculate Coefficient of Variation and Beta for Each Stock
    const stockStatisticsQuery = `
      WITH StockReturns AS (
        SELECT 
            s.stock_symbol,
            s.timestamp,
            (s.close_price - LAG(s.close_price) OVER (PARTITION BY s.stock_symbol ORDER BY s.timestamp)) /
            LAG(s.close_price) OVER (PARTITION BY s.stock_symbol ORDER BY s.timestamp) AS stock_return
        FROM StockHistory s
        WHERE s.stock_symbol = ANY($1::text[])
          AND s.timestamp BETWEEN $2 AND $3
      ),
      MarketReturns AS (
        SELECT 
            s.timestamp,
            AVG(s.close_price) AS market_price,
            (AVG(s.close_price) - LAG(AVG(s.close_price)) OVER (ORDER BY s.timestamp)) /
            LAG(AVG(s.close_price)) OVER (ORDER BY s.timestamp) AS market_return
        FROM StockHistory s
        WHERE s.stock_symbol = ANY($1::text[])
          AND s.timestamp BETWEEN $2 AND $3
        GROUP BY s.timestamp
      )
      SELECT 
          sr.stock_symbol,
          STDDEV(sr.stock_return) / AVG(ABS(sr.stock_return)) AS coefficient_of_variation,
          COVAR_SAMP(sr.stock_return, mr.market_return) / VAR_SAMP(mr.market_return) AS beta
      FROM StockReturns sr
      JOIN MarketReturns mr ON sr.timestamp = mr.timestamp
      GROUP BY sr.stock_symbol;
    `;

    const stockStatisticsResult = await pool.query(stockStatisticsQuery, [
      stockSymbols,
      start_date || "2015-01-01",
      end_date || new Date().toISOString(),
    ]);

    const stockStatistics = stockStatisticsResult.rows;

    // Calculate Covariance and Correlation Matrix
    const covarianceCorrelationQuery = `
      WITH StockReturns AS (
        SELECT 
            s.stock_symbol,
            s.timestamp,
            (s.close_price - LAG(s.close_price) OVER (PARTITION BY s.stock_symbol ORDER BY s.timestamp)) /
            LAG(s.close_price) OVER (PARTITION BY s.stock_symbol ORDER BY s.timestamp) AS stock_return
        FROM StockHistory s
        WHERE s.stock_symbol = ANY($1::text[])
          AND s.timestamp BETWEEN $2 AND $3
      ),
      CombinedData AS (
        SELECT
            sr1.stock_symbol AS stock1,
            sr2.stock_symbol AS stock2,
            sr1.stock_return AS return1,
            sr2.stock_return AS return2
        FROM StockReturns sr1
        JOIN StockReturns sr2
          ON sr1.timestamp = sr2.timestamp
        WHERE sr1.stock_symbol = ANY($1::text[])
          AND sr2.stock_symbol = ANY($1::text[])
      )
      SELECT
          cd.stock1,
          cd.stock2,
          COVAR_SAMP(cd.return1, cd.return2) AS covariance,
          CORR(cd.return1, cd.return2) AS correlation
      FROM CombinedData cd
      GROUP BY cd.stock1, cd.stock2;
    `;

    const covarianceCorrelationResult = await pool.query(covarianceCorrelationQuery, [
      stockSymbols,
      start_date || "1970-01-01",
      end_date || new Date().toISOString(),
    ]);

    const covarianceCorrelationMatrix = covarianceCorrelationResult.rows;

    // Return the results
    res.json({
      stockListId: list_id,
      stockStatistics,
      covarianceCorrelationMatrix,
    });
  } catch (err) {
    console.error("Error fetching stock list statistics:", err.message, err.stack);
    res.status(500).json({ error: "Failed to fetch stock list statistics" });
  }
});

// Get all stock lists created by a user *
app.get("/stocklists/:user_id", async (req, res) => {
  const { user_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * 
       FROM StockLists 
       WHERE user_id = $1`,
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stock lists" });
  }
});

// Delete a stock list *
app.delete("/stocklists", async (req, res) => {
  const { list_id, user_id } = req.body;

  try {
    // Verify that the user owns the stock list
    const listResult = await pool.query(
      `SELECT user_id FROM StockLists WHERE list_id = $1`,
      [list_id]
    );

    if (listResult.rows.length === 0) {
      return res.status(404).json({ error: "Stock list not found" });
    }

    if (listResult.rows[0].user_id !== user_id) {
      return res.status(403).json({ error: "You are not authorized to delete this stock list" });
    }

    // Delete the stock list
    const deleteResult = await pool.query(
      `DELETE FROM StockLists WHERE list_id = $1`,
      [list_id]
    );

    res.json({ message: "Stock list deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete stock list" });
  }
});

// Get all shared stock lists for a user, ordered by name *
app.get("/stocklists/shared/:user_id", async (req, res) => {
  const { user_id } = req.params;

  // Ensure user_id is treated as an integer
  const parsedUserId = parseInt(user_id, 10);
  if (isNaN(parsedUserId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    // Fetch shared stock lists the user has access to, ordered by name
    const result = await pool.query(
      `SELECT sl.list_id, sl.name, sl.created_at, sl.visibility, u.username AS owner
       FROM StockLists sl
       JOIN Users u ON sl.user_id = u.id
       WHERE sl.visibility = 'shared' AND sl.list_id IN (
         SELECT list_id FROM Visibility WHERE user_id = $1
       )
       ORDER BY sl.name ASC`,
      [parsedUserId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch shared stock lists" });
  }
});

// Get data for a stock list *
app.get("/stocklists/data/:list_id", async (req, res) => {
  const { list_id } = req.params;

  try {
    // Fetch stock list details and creator's name
    const stockListDetails = await pool.query(
      `SELECT sl.list_id, sl.name AS list_name, sl.visibility, sl.created_at, u.username AS creator_name
       FROM StockLists sl
       JOIN Users u ON sl.user_id = u.id
       WHERE sl.list_id = $1`,
      [list_id]
    );

    if (stockListDetails.rows.length === 0) {
      return res.status(404).json({ error: "Stock list not found" });
    }

    // Fetch stock items with the latest stock price and company name
    const stockItems = await pool.query(
      `SELECT sli.stock_symbol, sli.quantity, s.stock_name,
              COALESCE(sh.close_price, 0) AS latest_price
       FROM StockListStocks sli
       JOIN Stocks s ON sli.stock_symbol = s.stock_symbol
       LEFT JOIN LATERAL (
         SELECT close_price
         FROM StockHistory
         WHERE stock_symbol = sli.stock_symbol
         ORDER BY timestamp DESC
         LIMIT 1
       ) sh ON true
       WHERE sli.list_id = $1`,
      [list_id]
    );

    res.json({
      stockList: stockListDetails.rows[0],
      stockItems: stockItems.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stock list data" });
  }
});

// Add a stock to a stock list *
app.post("/stocklists/:list_id/stocks", async (req, res) => {
  const { list_id, stock_symbol, quantity, user_id } = req.body;

  try {
    // Check if the user is the creator of the stock list
    const listCheck = await pool.query(
      `SELECT user_id FROM StockLists WHERE list_id = $1`,
      [list_id]
    );

    if (listCheck.rows.length === 0) {
      return res.status(404).json({ error: "Stock list not found" });
    }

    if (listCheck.rows[0].user_id !== user_id) {
      return res.status(403).json({ error: "You are not the creator of this stock list" });
    }

    // Check if the stock exists
    const stockCheck = await pool.query(
      `SELECT stock_symbol FROM Stocks WHERE stock_symbol = $1`,
      [stock_symbol]
    );

    if (stockCheck.rows.length === 0) {
      return res.status(404).json({ error: "Stock not found" });
    }

    // Check if the stock is already in the list
    const checkResult = await pool.query(
      `SELECT * FROM StockListStocks WHERE list_id = $1 AND stock_symbol = $2`,
      [list_id, stock_symbol]
    );

    if (checkResult.rows.length > 0) {
      return res.status(409).json({ error: "Stock already exists in the list" });
    }

    // Insert the stock into the stock list
    const result = await pool.query(
      `INSERT INTO StockListStocks (list_id, stock_symbol, quantity)
       VALUES ($1, $2, $3)
       RETURNING list_id, stock_symbol, quantity`,
      [list_id, stock_symbol, quantity]
    );

    res.json({
      message: "Stock added to the list successfully",
      stock: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add stock to the list" });
  }
});

// Remove a stock from a stock list *
app.delete("/stocklists/:list_id/stocks", async (req, res) => {
  const { list_id, stock_symbol, user_id } = req.body;

  try {
    // Check if the user is the creator of the stock list
    const listCheck = await pool.query(
      `SELECT user_id FROM StockLists WHERE list_id = $1`,
      [list_id]
    );

    if (listCheck.rows.length === 0) {
      return res.status(404).json({ error: "Stock list not found" });
    }

    if (listCheck.rows[0].user_id !== user_id) {
      return res.status(403).json({ error: "You are not the creator of this stock list" });
    }

    // Delete the stock from the stock list
    const result = await pool.query(
      `DELETE FROM StockListStocks
       WHERE list_id = $1 AND stock_symbol = $2`,
      [list_id, stock_symbol]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Stock not found in the list" });
    }

    res.json({ message: "Stock removed from the list successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove stock from the list" });
  }
});

// Share a stock list with another user *
app.post("/stocklists/:list_id/share", async (req, res) => {
  const { list_id, username, current_user_id } = req.body;

  try {
    // Check if the stock list exists and belongs to the current user
    const listResult = await pool.query(
      `SELECT user_id, visibility FROM StockLists WHERE list_id = $1`,
      [list_id]
    );

    if (listResult.rows.length === 0) {
      return res.status(404).json({ error: "Stock list not found" });
    }

    const { user_id: owner_id, visibility } = listResult.rows[0];

    if (owner_id !== current_user_id) {
      return res.status(403).json({ error: "You are not authorized to share this stock list" });
    }

    // If the stock list is public, no need to share explicitly
    if (visibility === "public") {
      return res.status(400).json({ error: "This stock list is already public and accessible to all users" });
    }

    // Get the user_id for the username
    const userResult = await pool.query(
      `SELECT id FROM Users WHERE username = $1`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user_id = userResult.rows[0].id;

    // Check if the user already has access to the stock list
    const accessCheck = await pool.query(
      `SELECT 1 FROM Visibility WHERE list_id = $1 AND user_id = $2`,
      [list_id, user_id]
    );

    if (accessCheck.rows.length > 0) {
      return res.status(409).json({ error: "User already has access to this stock list" });
    }

    // Update the visibility to "shared"
    await pool.query(
      `UPDATE StockLists SET visibility = 'shared' WHERE list_id = $1`,
      [list_id]
    );

    // Share the stock list with the user
    const result = await pool.query(
      `INSERT INTO Visibility (list_id, user_id)
       VALUES ($1, $2)
       RETURNING list_id, user_id`,
      [list_id, user_id]
    );

    res.json({
      message: "Stock list shared successfully",
      sharedList: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to share stock list" });
  }
});

// -- Friends management --

// Create or accept a friend request *
app.post("/friends", async (req, res) => {
  const { req_friend_name, rec_friend_name } = req.body;

  try {
    // Check if the other person has already sent a friend request
    const reverseCheck = await pool.query(
      `SELECT relation_id
       FROM Friends
       WHERE req_friend = $2 AND rec_friend = $1 AND pending = true`,
      [req_friend_name, rec_friend_name]
    );

    if (reverseCheck.rows.length > 0) {
      // Accept the existing friend request
      const acceptResult = await pool.query(
        `UPDATE Friends
         SET pending = false
         WHERE req_friend = $2 AND rec_friend = $1
         RETURNING relation_id, req_friend, rec_friend, pending`,
        [req_friend_name, rec_friend_name]
      );

      return res.json({
        message: "Friend request accepted",
        friendRequest: acceptResult.rows[0],
      });
    }

    // Check if the friend request already exists in the current direction
    const checkResult = await pool.query(
      `SELECT 1
       FROM Friends
       WHERE req_friend = $1 AND rec_friend = $2`,
      [req_friend_name, rec_friend_name]
    );

    if (checkResult.rows.length > 0) {
      return res.status(409).json({ error: "Friend request already exists" });
    }

    // Check if the receiver was recently deleted as a friend
    const recentDeletionCheck = await pool.query(
      `SELECT *
       FROM FriendRequests
       WHERE sender_id = $1
         AND receiver_id = $2
         AND status = 'DELETED' OR status = 'REJECTED'
         AND updated_at > NOW() - INTERVAL '5 minutes'`,
      [req_friend_name, rec_friend_name]
    );

    if (recentDeletionCheck.rows.length > 0) {
      return res.status(403).json({ error: "You must wait 5 minutes before re-sending a friend request to this user" });
    }

    // Insert a new friend request
    const result = await pool.query(
      `INSERT INTO Friends (req_friend, rec_friend)
       VALUES ($1, $2)
       RETURNING relation_id, req_friend, rec_friend, pending`,
      [req_friend_name, rec_friend_name]
    );

    res.json({
      message: "Friend request sent successfully",
      friendRequest: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create or accept friend request" });
  }
});

// Accept friend request *
app.put("/friends/accept", async (req, res) => {
  const { req_friend_name, rec_friend_name } = req.body;

  try {
    // Update the friend request to accepted
    const result = await pool.query(
      `UPDATE Friends
       SET pending = false
       WHERE req_friend = $1 AND rec_friend = $2
       RETURNING relation_id, req_friend, rec_friend, pending`,
      [req_friend_name, rec_friend_name]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    res.json({
      message: "Friend request accepted",
      friendRequest: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to accept friend request" });
  }
});

// Deny a friend request *
app.put("/friends/deny", async (req, res) => {
  const { req_friend_name, rec_friend_name } = req.body;

  try {
    // Check if the friend request exists and is pending
    const requestCheck = await pool.query(
      `SELECT relation_id
       FROM Friends
       WHERE req_friend = $1 AND rec_friend = $2 AND pending = true`,
      [req_friend_name, rec_friend_name]
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: "Friend request not found or already handled" });
    }

    // Delete the pending friend request
    const deleteResult = await pool.query(
      `DELETE FROM Friends
       WHERE req_friend = $1 AND rec_friend = $2 AND pending = true`,
      [req_friend_name, rec_friend_name]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: "Failed to deny friend request" });
    }

    // Log the denial in the FriendRequests table
    await pool.query(
      `INSERT INTO FriendRequests (sender_id, receiver_id, status)
       VALUES (
         $1,
         $2,
         'REJECTED'
       )
       ON CONFLICT (sender_id, receiver_id)
       DO UPDATE SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP`,
      [req_friend_name, rec_friend_name]
    );

    res.json({ message: "Friend request denied and logged successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to deny friend request" });
  }
});

// Remove a friend *
app.delete("/friends", async (req, res) => {
  const { req_friend_id, rec_friend_id } = req.body;

  try {
    // Delete the friend relationship
    const result = await pool.query(
      `DELETE FROM Friends
       WHERE (req_friend = $1 AND rec_friend = $2)
       OR (rec_friend = $1 AND req_friend = $2)`,
      [req_friend_id, rec_friend_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Friend relationship not found" });
    }

    // Log the removal in the FriendRequests table
    await pool.query(
      `INSERT INTO FriendRequests (sender_id, receiver_id, status)
       VALUES ($1, $2, 'DELETED')
       ON CONFLICT (sender_id, receiver_id)
       DO UPDATE SET status = 'DELETED', updated_at = CURRENT_TIMESTAMP`,
      [req_friend_id, rec_friend_id]
    );

    res.json({ message: "Friend removed successfully and logged in FriendRequests table" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove friend" });
  }
});

// Search for new friends *
app.get("/friends/search/:query/:user_id", async (req, res) => {
  const { query, user_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT id AS user_id, username
       FROM Users
       WHERE username ILIKE $1 AND id != $2`,
       [`${query}%`, user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

// Withdraw friend request *
app.delete("/friends/withdraw", async (req, res) => {
  const { req_friend_id, rec_friend_id } = req.body;

  try {
    // Delete the friend request
    const result = await pool.query(
      `DELETE FROM Friends
       WHERE req_friend = $1 AND rec_friend = $2 AND pending = true`,
      [req_friend_id, rec_friend_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    res.json({ message: "Friend request withdrawn successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to withdraw friend request" });
  }
});

// Get friends list *
app.get("/friends/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const result = await pool.query(
      `SELECT DISTINCT u.username AS friend_username
       FROM Friends f
       JOIN Users u ON (f.req_friend = $1 AND f.rec_friend = u.username)
                  OR (f.rec_friend = $1 AND f.req_friend = u.username)
       WHERE f.pending = false`,
      [username]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching friends list:", err.message, err.stack);
    res.status(500).json({ error: "Failed to fetch friends list" });
  }
});

// Get incoming friend requests
app.get("/friends/requests/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const result = await pool.query(
      `SELECT f.relation_id, u.username AS requester_username
       FROM Friends f
       JOIN Users u ON f.req_friend = u.username
       WHERE f.rec_friend = $1 AND f.pending = true`,
      [username]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching incoming friend requests:", err.message, err.stack);
    res.status(500).json({ error: "Failed to fetch incoming friend requests" });
  }
});

// Get outgoing friend requests *
app.get("/friends/outgoing/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const result = await pool.query(
      `SELECT f.relation_id, u.username AS recipient_username
       FROM Friends f
       JOIN Users u ON f.rec_friend = u.username
       WHERE f.req_friend = $1 AND f.pending = true`,
      [username]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching outgoing friend requests:", err.message, err.stack);
    res.status(500).json({ error: "Failed to fetch outgoing friend requests" });
  }
});

// Get non-friends list by username *
app.get("/friends/non-friends/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const result = await pool.query(
      `SELECT u.username
       FROM Users u
       WHERE u.username != $1
       AND u.username NOT IN (
         SELECT req_friend FROM Friends WHERE rec_friend = $1
         UNION
         SELECT rec_friend FROM Friends WHERE req_friend = $1
       )`,
      [username]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching non-friends list:", err.message, err.stack);
    res.status(500).json({ error: "Failed to fetch non-friends list" });
  }
});

// -- Stock List Review management --

// Get all reviews for a stock list
app.get("/review/list/:list_id", async (req, res) => {
  const { list_id } = req.params;
  const { user_id } = req.query;

  try {
    // Check if the user has access to the stock list
    const accessCheck = await pool.query(
      `SELECT sl.list_id, sl.visibility, sl.user_id AS owner_id
       FROM StockLists sl
       LEFT JOIN Visibility v ON sl.list_id = v.list_id
       WHERE sl.list_id = $1
       AND (sl.user_id = $2 OR sl.visibility = 'public' OR v.user_id = $2)`,
      [list_id, user_id]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: "You do not have access to this stock list" });
    }

    // Fetch all reviews for the stock list
    const reviews = await pool.query(
      `SELECT r.review_id, r.content, r.created_at, u.username AS reviewer
       FROM Reviews r
       JOIN Users u ON r.user_id = u.id
       WHERE r.list_id = $1
       ORDER BY r.created_at DESC`,
      [list_id]
    );

    res.json(reviews.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reviews for the stock list" });
  }
});

// Create a review for a stock list
app.post("/review/:list_id", async (req, res) => {
  const { list_id } = req.params;
  const { user_id, content } = req.body;

  try {
    // Check if the user has access to the stock list
    const accessCheck = await pool.query(
      `SELECT sl.list_id, sl.visibility, sl.user_id AS owner_id
       FROM StockLists sl
       LEFT JOIN Visibility v ON sl.list_id = v.list_id
       WHERE sl.list_id = $1
       AND (sl.user_id = $2 OR sl.visibility = 'public' OR v.user_id = $2)`,
      [list_id, user_id]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: "You do not have access to this stock list" });
    }

    // Check if the user has already posted a review
    const existingReview = await pool.query(
      `SELECT review_id
       FROM Reviews
       WHERE list_id = $1 AND user_id = $2`,
      [list_id, user_id]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({ error: "You have already posted a review for this stock list" });
    }

    // Insert the new review
    const result = await pool.query(
      `INSERT INTO Reviews (user_id, list_id, content)
       VALUES ($1, $2, $3)
       RETURNING review_id, user_id, list_id, content, created_at`,
      [user_id, list_id, content]
    );

    res.json({
      message: "Review created successfully",
      review: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create review" });
  }
});

// Edit a review for a stock list
app.put("/review/:review_id", async (req, res) => {
  const { review_id } = req.params;
  const { user_id, content } = req.body;

  try {
    // Check if the user is the creator of the review
    const reviewCheck = await pool.query(
      `SELECT review_id
       FROM Reviews
       WHERE review_id = $1 AND user_id = $2`,
      [review_id, user_id]
    );

    if (reviewCheck.rows.length === 0) {
      return res.status(403).json({ error: "You are not authorized to edit this review" });
    }

    // Update the review content
    const result = await pool.query(
      `UPDATE Reviews
       SET content = $1, edited_at = CURRENT_TIMESTAMP
       WHERE review_id = $2
       RETURNING review_id, user_id, list_id, content, edited_at`,
      [content, review_id]
    );

    res.json({
      message: "Review updated successfully",
      review: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update review" });
  }
});

// Delete a review for a stock list
app.delete("/review/:review_id", async (req, res) => {
  const { review_id } = req.params;
  const { user_id } = req.body;

  try {
    // Check if the user is the creator of the review or the owner of the stock list
    const reviewCheck = await pool.query(
      `SELECT r.review_id, sl.user_id AS list_owner
       FROM Reviews r
       JOIN StockLists sl ON r.list_id = sl.list_id
       WHERE r.review_id = $1 AND (r.user_id = $2 OR sl.user_id = $2)`,
      [review_id, user_id]
    );

    if (reviewCheck.rows.length === 0) {
      return res.status(403).json({ error: "You are not authorized to delete this review" });
    }

    // Delete the review
    const result = await pool.query(
      `DELETE FROM Reviews
       WHERE review_id = $1`,
      [review_id]
    );

    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete review" });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});