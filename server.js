// 1. IMPORT DEPENDENCIES & INITIALIZE SERVER
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// cors() allows your Squarespace domain to send requests to this server
app.use(cors()); 

// Enables express to parse incoming JSON payloads from the frontend
app.use(express.json()); 

// Connect to Supabase securely using hidden environment variables stored on Render
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 2. DEFINE THE API ENDPOINT (/api/scratch)
app.post('/api/scratch', async (req, res) => {
  try {
    const { email, ticket_code } = req.body;

    // Reject early if required fields are missing
    if (!email || !ticket_code) {
      return res.status(400).json({ success: false, error: 'Email and ticket code are required.' });
    }

    // Clean inputs (e.g., " User@Email.com " -> "user@email.com")
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = ticket_code.trim().toUpperCase();

    // -------------------------------------------------------------
    // CHECK 1: EMAIL DUPLICATION
    // Query claims table for existing entry
    // -------------------------------------------------------------
    const { data: existingClaim } = await supabase
      .from('claims')
      .select('email')
      .eq('email', cleanEmail)
      .single();

    if (existingClaim) {
      return res.status(400).json({ 
        success: false, 
        error: 'This email address has already participated.' 
      });
    }

    // -------------------------------------------------------------
    // CHECK 2: TICKET VALIDATION
    // Fetch code from tickets table
    // -------------------------------------------------------------
    const { data: ticket } = await supabase
      .from('tickets')
      .select('code, is_used, prize_name')
      .eq('code', cleanCode)
      .single();

    // If code doesn't exist in our 240 pre-generated pool
    if (!ticket) {
      return res.status(400).json({ success: false, error: 'Invalid ticket code.' });
    }

    // If code was already redeemed by someone else
    if (ticket.is_used) {
      return res.status(400).json({ success: false, error: 'This ticket code has already been redeemed.' });
    }

    // -------------------------------------------------------------
    // EXECUTE CLAIM
    // Mark ticket as used and record the user claim
    // -------------------------------------------------------------
    await supabase
      .from('tickets')
      .update({ is_used: true })
      .eq('code', cleanCode);

    await supabase
      .from('claims')
      .insert([{
        email: cleanEmail,
        ticket_code: cleanCode,
        prize_awarded: ticket.prize_name
      }]);

    // -------------------------------------------------------------
    // RETURN RESULT
    // Send success status and the prize back to front-end canvas
    // -------------------------------------------------------------
    return res.json({ success: true, prize: ticket.prize_name });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// 3. START SERVER LISTENING ON PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));