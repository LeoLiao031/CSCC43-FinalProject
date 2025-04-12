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

// -- User management --

// Create a user
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

// Get user by username
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

// Search for usernames
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

// Create a portfolio
app.post("/portfolios", async (req, res) => {
  const { port_name, cash_dep, username } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO Portfolios (port_name, cash_dep, username)
       SELECT $1, $2, $3
       WHERE NOT EXISTS (SELECT 1 FROM Portfolios WHERE port_name = $1 AND username = $3)
       RETURNING port_name, cash_dep, username`,
      [port_name, cash_dep, username]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Portfolio creation failed" });
  }
});

// Delete a portfolio
app.delete("/portfolios", async (req, res) => {
  const { port_name, username } = req.body;
  try {
    const result = await pool.query(
      `DELETE FROM Portfolios 
       WHERE port_name = $1 AND username = $2`,
      [port_name, username]
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

// Get all portfolios for a user
app.get("/portfolios/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM Portfolios WHERE username = $1`,
      [username]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch portfolios" });
  }
});

// Get portfolio info
app.get("/portfolios/:port_id/:owner", async (req, res) => {
  const { port_id, owner } = req.params;
  try {
    const result = await pool.query(
      `SELECT *
       FROM Portfolios
       WHERE port_id = $1 AND username = $2
       LIMIT 1`,
      [port_id, owner]
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

// Deposit cash into portfolio
app.put("/portfolios/deposit", async (req, res) => {
  const { port_name, owner, amount } = req.body;
  try {
    const result = await pool.query(
      `UPDATE Portfolios
       SET cash_dep = cash_dep + $1
       WHERE port_name = $2 AND username = $3
       RETURNING port_name, cash_dep, username`,
      [amount, port_name, owner]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Portfolio not found" });
    }
    res.json({ message: "Deposit successful", portfolio: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to deposit cash" });
  }
});

// Transfer cash between portfolios
app.put("/portfolios/transfer", async (req, res) => {
  const { give_port, get_port, owner, amount } = req.body;

  try {
    // Start a transaction
    await pool.query("BEGIN");

    // Deduct cash from the giving portfolio
    const deductResult = await pool.query(
      `UPDATE Portfolios
       SET cash_dep = cash_dep - $1
       WHERE port_name = $2 AND username = $3
       RETURNING port_name, cash_dep`,
      [amount, give_port, owner]
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
       WHERE port_name = $2 AND username = $3
       RETURNING port_name, cash_dep`,
      [amount, get_port, owner]
    );

    if (addResult.rowCount === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Receiving portfolio not found" });
    }

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

// Buy a stock for a portfolio
app.post("/portfolios/stocks/buy", async (req, res) => {
  const { port_id, stock_symbol, amount } = req.body;

  try {
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

// Sell a stock from a portfolio
app.delete("/portfolios/stocks/sell", async (req, res) => {
  const { port_id, stock_symbol, amount } = req.body;

  try {
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
      return res.status(400).json({ error: "Insufficient stock quantity" });
    }

    // Add the total revenue to the portfolio's cash
    await pool.query(
      `UPDATE Portfolios
       SET cash_dep = cash_dep + $1
       WHERE port_id = $2`,
      [total_revenue, port_id]
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

// Add a new stock to StockHistory (specific timestamp)
app.post("/stocks", async (req, res) => {
  const { stock_symbol, timestamp, open_price, high_price, low_price, close_price, volume } = req.body;

  try {
    // Insert a new stock history record
    const result = await pool.query(
      `INSERT INTO StockHistory (stock_symbol, timestamp, open_price, high_price, low_price, close_price, volume)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
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

// Get stock data
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

// TODO: Get prediction data for stock performance 

// -- Stock Lists --

// Create a new stock list
app.post("/stocklists", async (req, res) => {
  const { list_name, username, visibility } = req.body;

  try {
    // Retrieve the user_id for the given username
    const userResult = await pool.query(
      `SELECT id 
       FROM Users 
       WHERE username = $1`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user_id = userResult.rows[0].id;

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

// Get all stock lists created by a user
app.get("/stocklists/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(
      `SELECT * 
       FROM StockLists 
       WHERE user_id = (SELECT id FROM Users WHERE username = $1)`,
      [username]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stock lists" });
  }
});

// Delete a stock list
app.delete("/stocklists", async (req, res) => {
  const { list_id, username } = req.body;

  try {
    // Retrieve the user_id for the given username
    const userResult = await pool.query(
      `SELECT id FROM Users WHERE username = $1`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user_id = userResult.rows[0].id;

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

// Get all public stock lists
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

// Get all shared stock lists for a user
app.get("/stocklists/shared/:username", async (req, res) => {
  const { username } = req.params;

  try {
    // Retrieve the user_id for the given username
    const userResult = await pool.query(
      `SELECT id FROM Users WHERE username = $1`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user_id = userResult.rows[0].user_id;

    // Fetch shared stock lists the user has access to
    const result = await pool.query(
      `SELECT sl.list_id, sl.name, sl.created_at, sl.visibility, u.username AS owner
       FROM StockLists sl
       JOIN Users u ON sl.user_id = u.id
       WHERE sl.visibility = 'shared' AND sl.list_id IN (
         SELECT list_id FROM Visibility WHERE user_id = $1
       )`,
      [user_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch shared stock lists" });
  }
});

// Get data for a stock list
app.get("/stocklists/data/:list_id", async (req, res) => {
  const { list_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT s.stock_symbol, s.quantity, sh.timestamp, sh.open_price, sh.high_price, sh.low_price, sh.close_price, sh.volume
        FROM StockListStocks s
        JOIN StockHistory sh ON s.stock_symbol = sh.stock_symbol
        WHERE s.list_id = $1`,
      [list_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No stocks found for this list" });
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stock list data" });
  }
});

// Add a stock to a stock list
app.post("/stocklists/:list_id/stocks", async (req, res) => {
  const { list_id, stock_symbol, quantity } = req.body;
  try {
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

// Remove a stock from a stock list
app.delete("/stocklists/:list_id/stocks", async (req, res) => {
  const { list_id, stock_symbol } = req.body;
  try {
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

// Share a stock list with another user
app.post("/stocklists/:list_id/share", async (req, res) => {
  const { list_id, username } = req.body;
  try {
    // Retrieve the user_id for the given username
    const userResult = await pool.query(
      `SELECT id FROM Users WHERE username = $1`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user_id = userResult.rows[0].id;

    // Check if the stock list exists
    const listResult = await pool.query(
      `SELECT 1 FROM StockLists WHERE list_id = $1`,
      [list_id]
    );

    if (listResult.rows.length === 0) {
      return res.status(404).json({ error: "Stock list not found" });
    }

    // Check if the user already has access to the list
    const accessCheck = await pool.query(
      `SELECT 1 FROM Visibility WHERE list_id = $1 AND user_id = $2`,
      [list_id, user_id]
    );

    if (accessCheck.rows.length > 0) {
      return res.status(409).json({ error: "User already has access to this list" });
    }

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

// Create or accept a friend request
app.post("/friends", async (req, res) => {
  const { req_friend, rec_friend } = req.body;

  try {
    // Check if the other person has already sent a friend request
    const reverseCheck = await pool.query(
      `SELECT relation_id
       FROM Friends
       WHERE req_friend = $2 AND rec_friend = $1 AND pending = true`,
      [req_friend, rec_friend]
    );

    if (reverseCheck.rows.length > 0) {
      // Accept the existing friend request
      const acceptResult = await pool.query(
        `UPDATE Friends
         SET pending = false
         WHERE req_friend = $2 AND rec_friend = $1
         RETURNING relation_id, req_friend, rec_friend, pending`,
        [req_friend, rec_friend]
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
      [req_friend, rec_friend]
    );

    if (checkResult.rows.length > 0) {
      return res.status(409).json({ error: "Friend request already exists" });
    }

    // Insert a new friend request
    const result = await pool.query(
      `INSERT INTO Friends (req_friend, rec_friend)
       VALUES ($1, $2)
       RETURNING relation_id, req_friend, rec_friend, pending`,
      [req_friend, rec_friend]
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

// Accept friend request
app.put("/friends/accept", async (req, res) => {
  const { req_friend, rec_friend } = req.body;

  try {
    // Update the friend request to accepted
    const result = await pool.query(
      `UPDATE Friends
       SET pending = false
       WHERE req_friend = $1 AND rec_friend = $2
       RETURNING relation_id, req_friend, rec_friend, pending`,
      [req_friend, rec_friend]
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

// Remove a friend
app.delete("/friends", async (req, res) => {
  const { req_friend, rec_friend } = req.body;

  try {
    // Delete the friend relationship
    const result = await pool.query(
      `DELETE FROM Friends
       WHERE (req_friend = $1 AND rec_friend = $2)
       OR (rec_friend = $1 AND req_friend = $2)`
      [req_friend, rec_friend]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Friend relationship not found" });
    }

    res.json({ message: "Friend removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove friend" });
  }
});

// Search for new friends
app.get("/friends/search/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM Users WHERE username ILIKE $1`,
      [`${username}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

// Withdraw friend request
app.delete("/friends/withdraw", async (req, res) => {
  const { req_friend, rec_friend } = req.body;

  try {
    // Delete the friend request
    const result = await pool.query(
      `DELETE FROM Friends
       WHERE req_friend = $1 AND rec_friend = $2 AND pending = true`,
      [req_friend, rec_friend]
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

// Get friends list (make sure pending is false)
app.get("/friends/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM Friends WHERE (req_friend = $1 OR rec_friend = $1) AND pending = false`,
      [username]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch friends list" });
  }
});

// Get incoming friend requests
app.get("/friends/requests/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM Friends WHERE rec_friend = $1 AND pending = true`,
      [username]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch incoming friend requests" });
  }
});

// Get outgoing friend requests
app.get("/friends/outgoing/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM Friends WHERE req_friend = $1 AND pending = true`,
      [username]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch outgoing friend requests" });
  }
});

// Get non-friends list
app.get("/friends/non-friends/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM Users WHERE username != $1 AND username NOT IN (SELECT req_friend FROM Friends WHERE rec_friend = $1 UNION SELECT rec_friend FROM Friends WHERE req_friend = $1)`,
      [username]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch non-friends list" });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});