const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Route de test simple
app.get('/', (req, res) => {
  res.json({ message: 'Backend is running!' });
});

// Créer un utilisateur
app.post('/create-user', async (req, res) => {
  try {
    const { email, password } = req.body; // Correction: utiliser email au lieu de user
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et password requis.' });
    }

    const { data, error } = await supabase
      .from('user') // Assure-toi que c'est le bon nom de ta table
      .insert([{
        email,
        password
      }])
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({
      success: true,
      user: {
        id: data[0].id,
        email: data[0].email
        // Ne pas retourner le mot de passe
      }
    });

  } catch (error) {
    console.error('Erreur lors de la création:', error);
    res.status(500).json({ error: 'Erreur interne.' });
  }
});

// Récupérer tous les utilisateurs
app.get('/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user')
      .select('id, email') // Ne pas récupérer les mots de passe
      .order('email', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      users: data
    });

  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    res.status(500).json({ error: 'Erreur interne.' });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});