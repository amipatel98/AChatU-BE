import jwt from 'jsonwebtoken';
// md5
import md5 from 'md5';
// models
import UserModel from '../models/User.js';

const SECRET_KEY = 'some-secret-key';

export const encode = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({email: email, password: md5(password) });
    if(!user) return res.status(500).json({ success: false, error: 'Invalid Authentication' });

    const payload = {
      userId: user._id,
      role: user.role,
      isActive: user.isActive
    };
    const authToken = jwt.sign(payload, SECRET_KEY);
    req.authToken = authToken;
    next();
  } catch (error) {
    return res.status(400).json({ success: false, message: error.error });
  }
}

export const decode = (req, res, next) => {
  if (!req.headers['authorization']) {
    return res.status(400).json({ success: false, message: 'No access token provided' });
  }
  const accessToken = req.headers.authorization.split(' ')[1];
  try {
    const decoded = jwt.verify(accessToken, SECRET_KEY);
    req.userId = decoded.userId;
    req.userType = decoded.type;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message });
  }
}
