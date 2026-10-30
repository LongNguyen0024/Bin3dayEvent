// Load environment variables (.env file) into process.env
require('dotenv').config();

// Import required Node.js libraries
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Initialize the Express app
const app = express();

// Middleware: Enable Cross-Origin Resource Sharing (allows frontend to call backend)
app.use(cors());

// Middleware: Parse incoming JSON requests automatically
app.use(express.json());

// Initialize Supabase Client with Admin Access (Service Role Key bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =============================================================
// HEALTH CHECK ENDPOINT
// GET /
// Simple route to verify server is active on Render/ngrok
// =============================================================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Scratch ticket server is running.'
  });
});

// =============================================================
// VALIDATE & CONSUME TICKET ENDPOINT
// POST /api/scratch
// =============================================================
app.post('/api/scratch', async (req, res) => {
  try {
    // 1. Extract the ticket_code from the incoming JSON body
    const { ticket_code } = req.body;

    // Reject immediately if no code was provided
    if (!ticket_code) {
      return res.status(400).json({
        success: false,
        error: 'Ticket code is required.'
      });
    }

    // 2. Clean the string: remove spaces and normalize to uppercase
    const cleanCode = String(ticket_code).trim().toUpperCase();
    console.log('Play attempt:', cleanCode);

    // 3. Query Supabase to find if the ticket exists
    const { data: ticket, error: lookupError } = await supabase
      .from('tickets')
      .select('code, is_used, prize_name')
      .eq('code', cleanCode)
      .maybeSingle(); // Returns 1 object or null (doesn't throw error if not found)

    // Handle database connection errors
    if (lookupError) {
      console.error('Ticket lookup error:', lookupError);
      return res.status(500).json({
        success: false,
        error: 'Database error while checking ticket.'
      });
    }

    // 4. Reject if ticket code doesn't exist in Supabase
    if (!ticket) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticket code.'
      });
    }

    // 5. Reject if ticket code has already been scratched/used
    if (ticket.is_used) {
      return res.status(400).json({
        success: false,
        error: 'This ticket code has already been used.'
      });
    }

    // =========================================================
    // 6. CONSUME THE TICKET IMMEDIATELY
    // We update is_used = true ONLY if is_used is currently false.
    // This atomic query prevents race conditions (two people trying to
    // redeem the same ticket at the exact same millisecond).
    // =========================================================
    const { data: consumedTicket, error: consumeError } = await supabase
      .from('tickets')
      .update({ is_used: true })
      .eq('code', cleanCode)
      .eq('is_used', false) // Ensures double-spending protection
      .select('code, is_used, prize_name')
      .maybeSingle();

    if (consumeError) {
      console.error('Ticket consume error:', consumeError);
      return res.status(500).json({
        success: false,
        error: 'Unable to activate this ticket.'
      });
    }

    // If another request consumed it first in that microsecond
    if (!consumedTicket) {
      return res.status(400).json({
        success: false,
        error: 'This ticket code has already been used.'
      });
    }

    console.log(`Ticket consumed successfully: ${cleanCode} -> ${consumedTicket.prize_name}`);

    // 7. Return the verified ticket code and prize to the frontend
    return res.json({
      success: true,
      ticket_code: consumedTicket.code,
      prize: consumedTicket.prize_name
    });

  } catch (err) {
    console.error('Scratch endpoint error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.'
    });
  }
});

// Start Express server on specified PORT or default 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});