// utils
import makeValidation from '@withvoid/make-validation';
// md5
import md5 from 'md5';
// models
import UserModel from '../models/User.js';

export default {
  onGetAllUsers: async (req, res) => {
    try {
      const users = await UserModel.getUsers();
      if(users.length === 0) {
        return res.status(204).json({ success: true, users: [] });
      }
      return res.status(200).json({ success: true, users });
    } catch (error) {
      return res.status(500).json({ success: false, error: error })
    }
  },
  onGetUserById: async (req, res) => {
    try {
      const user = await UserModel.getUserById(req.params.id);
      if(!user) {
        return res.status(404).json({ success: true, user: {} });
      }
      return res.status(200).json({ success: true, user });
    } catch (error) {
      return res.status(500).json({ success: false, error: error })
    }
  },
  onActiveUser: async (req, res) => {
    try {
      const user = await UserModel.onActiveUsers(req.params.id, req.body.isActive);
      return res.status(200).json({ success: true, user });
    } catch (error) {
      return res.status(500).json({ success: false, error: error })
    }
  },
  onCreateUser: async (req, res) => {
    try {
      const validation = makeValidation(types => ({
        payload: req.body,
        checks: {
          firstName: { type: types.string },
          lastName: { type: types.string },
          email: { type: types.string },
          password: { type: types.string },
        }
      }));
      if (!validation.success) return res.status(400).json({ ...validation });

      const { firstName, lastName, email, password, role, status } = req.body;

      const isUserExist = await UserModel.getUserByEmail(email);
      if(isUserExist) return res.status(500).json({ success: false, error: 'User with this email exist' });

      const uniqueValue = uniqueRandom();
      const userName = firstName + '.' + lastName + uniqueValue;

      await UserModel.createUser(firstName, lastName, userName, email, md5(password), role, status);
      return res.status(200).json({ success: true, message: 'User created successfully...' });
    } catch (error) {
      return res.status(500).json({ success: false, error: error })
    }
  },
  onDeleteUserById: async (req, res) => {
    try {
      const user = await UserModel.deleteByUserById(req.params.id);
      return res.status(200).json({
        success: true,
        message: `Deleted a count of ${user.deletedCount} user.`
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error })
    }
  },
}

const uniqueRandom = function () {
  return '_' + Math.random().toString(36).substr(2, 4);
};
