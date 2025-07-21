const jwt = require('jsonwebtoken');

// ------------- generateAccessToken ------------------
const generateAccessToken = (payload) => {

  // Sign the token
  const token = jwt.sign(payload, 'secret', {
    expiresIn: '30d',
  });

  return token;
};


// ---------------- verifyToken --------------------
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized access - no token provided' });
  }

  try {
    const decoded = jwt.verify(token, 'secret');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Forbidden - invalid token' });
  }
};


// ---------------- send response ----------------
// utils/sendResponse.js
const sendResponse = (res, { success = true, statusCode = 200, message = '', data = null } = {}) => {
  // console.log(res);
  
  res.status(statusCode).json({
    success,
    statusCode,
    message,
    data,
  });
};

module.exports = {
  generateAccessToken,
  verifyToken,
  sendResponse
};
