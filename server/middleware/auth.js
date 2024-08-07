const jwt = require('jsonwebtoken');
const ErrorRespond = require('../utils/errorResponds');
const User = require('../models/user');


exports.isAuthenticated = async (req, res, next) => {
  try {
    let token = req.cookies.token;
    const name = req.query.filename;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'You must log in to access this resource' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }


    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.', redirect: '/login' });
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};


exports.afterlogin = async (req, res, next) => {
  try {
    let token = req.headers.authorization;
    if (!token || !token.startsWith('Bearer')) {
      return res.status(401).json({ error: 'You must log in to access this resource' });
    }

    token = token.split(' ')[1]; 

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
  
exports.checkRole = (req, res, next) => {
  const role = req.body.token;
  if (!role || role === 0) {
    return res.status(401).json({ error: 'Unregistered user, access denied'+role});
  }

  if (role !== 1  && req.path.includes('/memo/create' )) {
    return res.status(403).json({ error: 'Access Forbidden' });
  }
  next(console.log("dhdhdh"));
  
};



exports.isAdmin = (req, res, next) => {
  console.log('User object:', req.user); // Log the user object for inspection
  const role = req.user?.role; // Retrieve the role from req.user
  
  console.log('Role:', role); // Log the role for debugging

  if (!role || role === 0) {
    return res.status(403).json({ error: 'Access Forbidden' });
  }

  if (req.path === '/admin/dashboard') {
    next(); // Allows access to the admin dashboard
  } else {
    return res.status(403).json({ error: 'Access Forbidden' });
  }
};



exports.afterlogin = async (req, res, next) => {
  try {
    let token = req.headers.authorization;
    if (!token || !token.startsWith('Bearer')) {
      return res.status(401).json({ error: 'You must log in to access this resource' });
    }

    token = token.split(' ')[1]; 

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
  
exports.checkRole = (req, res, next) => {
  const role = req.body.token;
  if (!role || role === 0) {
    return res.status(401).json({ error: 'Unregistered user, access denied'+role});
  }

  if (role !== 1  && req.path.includes('/memo/create' )) {
    return res.status(403).json({ error: 'Access Forbidden' });
  }
  next(console.log("dhdhdh"));
  
};



exports.isAdmin = (req, res, next) => {
  console.log('User object:', req.user); // Log the user object for inspection
  const role = req.user?.role; // Retrieve the role from req.user
  
  console.log('Role:', role); // Log the role for debugging

  if (!role || role === 0) {
    return res.status(403).json({ error: 'Access Forbidden' });
  }

  if (req.path === '/admin/dashboard') {
    next(); // Allows access to the admin dashboard
  } else {
    return res.status(403).json({ error: 'Access Forbidden' });
  }
};
