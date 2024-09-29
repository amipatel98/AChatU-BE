import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4().replace(/\-/g, ""),
    },
    firstName: String,
    lastName: String,
    userName: String,
    role: String,
    isActive: {type: Boolean, default: 1},
    email: String,
    password: String
  },
  {
    timestamps: true,
    collection: "users",
  }
);

/**
 * @param {String} firstName
 * @param {String} lastName
 * @param {String} userName
 * @param {String} email
 * @param {String} password
 * @returns {Object} new user object created
 */
userSchema.statics.createUser = async function (firstName, lastName, userName, email, password, role, status) {
  try {
    const user = await this.create({ firstName, lastName, userName, email, password, role, status });
    return user;
  } catch (error) {
    throw error;
  }
}

/**
 * @param {String} email
 * @returns {Object} new user object created
 */
userSchema.statics.getUserByEmail = async function (email) {
  try {
    const user = await this.findOne({ email: email });
    return user;
  } catch (error) {
    throw error;
  }
}

/**
 * @param {String} id, user id
 * @return {Object} User profile object
 */
userSchema.statics.getUserById = async function (id) {
  try {
    const user = await this.findOne({ _id: id });
    if (!user) throw ({ error: 'No user with this id found' });
    return user;
  } catch (error) {
    throw error;
  }
}

/**
 * @return {Array} List of all users
 */
userSchema.statics.getUsers = async function () {
  try {
    const users = await this.find({},{firstName: 1, lastName: 1, userName: 1, email: 1, role: 1, isActive: 1});
    return users;
  } catch (error) {
    throw error;
  }
}

/**
 * @param {Array} ids, string of user ids
 * @return {Array of Objects} users list
 */
userSchema.statics.getUserByIds = async function (ids) {
  try {
    const users = await this.find({ _id: { $in: ids } });
    return users;
  } catch (error) {
    throw error;
  }
}

/**
 * @param {String} id - id of user
 * @return {Object} - details of action performed
 */
userSchema.statics.deleteByUserById = async function (id) {
  try {
    const result = await this.remove({ _id: id });
    return result;
  } catch (error) {
    throw error;
  }
}

userSchema.statics.onActiveUsers = async function (id, status) {
  try {
    const result = await this.updateMany({_id: id}, { $set: { isActive: status } });
    return result;
  } catch (error) {
    throw error;
  }
}

export default mongoose.model("User", userSchema);
