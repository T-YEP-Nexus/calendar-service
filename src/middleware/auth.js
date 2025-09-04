const jwt = require("jsonwebtoken");

// Middleware d'authentification basé sur un token stocké dans les cookies
// - Attend un cookie nommé "token"
// - Vérifie le JWT avec JWT_SECRET
// - Attache le payload décodé à req.user
// - Renvoie 401 si manquant/invalid/expiré
// - Pour /api-docs, vérifie que l'utilisateur est admin (rôle dans le token)
module.exports = async function authMiddleware(req, res, next) {
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

    // Vérification spéciale pour /api-docs : nécessite le rôle admin
    if (req.path.startsWith("/api-docs")) {
      if (decoded.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Forbidden: admin access required",
        });
      }
    }

    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: invalid or expired token",
    });
  }
};
