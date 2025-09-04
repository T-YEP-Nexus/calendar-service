const jwt = require("jsonwebtoken");

// Middleware d'authentification basé sur un token stocké dans les cookies
// - Attend un cookie nommé "token"
// - Vérifie le JWT avec JWT_SECRET
// - Attache le payload décodé à req.user
// - Renvoie 401 si manquant/invalid/expiré
module.exports = function authMiddleware(req, res, next) {
  // Toutes les routes nécessitent une authentification

  try {
    const token = req.cookies && req.cookies.token;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: not a registered user",
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: "Server misconfiguration: JWT_SECRET is not set",
      });
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: invalid or expired token",
    });
  }
};
