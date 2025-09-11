// PATCH: backend/routes/auth.js (replace only the /login handler with the following)
r.post('/login', (req, res) => {
  let { email, password } = req.body || {};
  email = (email || '').trim().toLowerCase();
  password = (password || '').toString();
  if (!email || !password) return res.status(400).json({ error: 'Email e password richieste' });
  const user = verifyCredentials(email, password);
  if (!user) return res.status(401).json({ error: 'Credenziali non valide' });
  const token = signUser(user);
  return res.json({ token, user: toClientUser(user) });
});
