import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const MESSAGE_TYPES = {
  TYPE_TEXT: "text",
};

const readByRecipientSchema = new mongoose.Schema(
  {
    _id: false,
    readByUserId: String,
    readAt: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    timestamps: false,
  }
);

const chatMessageSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4().replace(/\-/g, ""),
    },
    chatRoomId: String,
    message: mongoose.Schema.Types.Mixed,
    image: mongoose.Schema.Types.Mixed,
    replyMessage: mongoose.Schema.Types.Mixed,
    replyMessageId: String,
    type: {
      type: String,
      default: () => MESSAGE_TYPES.TYPE_TEXT,
    },
    postedByUser: String,
    readByRecipients: [readByRecipientSchema],
  },
  {
    timestamps: true,
    collection: "chatmessages",
  }
);


const forwardMessageSchema = new mongoose.Schema(
    {
      _id: {
        type: String,
        default: () => uuidv4().replace(/\-/g, ""),
      },
      chatRoomId: String,
      message: mongoose.Schema.Types.Mixed,
      // image: mongoose.Schema.Types.Mixed,
      messageId: String,
      type: {
        type: String,
        default: () => MESSAGE_TYPES.TYPE_TEXT,
      },
      forwardByUser: String,
      forwardToUser: Array,
      readByRecipients: [readByRecipientSchema],
    },
    {
      timestamps: true,
      collection: "forwardmessages",
    }
)

/**
 * This method will create a post in chat
 * 
 * @param {String} roomId - id of chat room
 * @param {Object} message - message you want to post in the chat room
 * @param {String} postedByUser - user who is posting the message
 */
chatMessageSchema.statics.createPostInChatRoom = async function (chatRoomId, message, image, postedByUser) {
  try {
    const post = await this.create({
      chatRoomId,
      message,
      image,
      postedByUser,
      readByRecipients: { readByUserId: postedByUser }
    });
    const aggregate = await this.aggregate([
      // get post where _id = post._id
      { $match: { _id: post._id } },
      // do a join on another table called users, and 
      // get me a user whose _id = postedByUser
      {
        $lookup: {
          from: 'users',
          localField: 'postedByUser',
          foreignField: '_id',
          as: 'postedByUser',
        }
      },
      { $unwind: '$postedByUser' },
      // do a join on another table called chatrooms, and 
      // get me a chatroom whose _id = chatRoomId
      {
        $lookup: {
          from: 'chatrooms',
          localField: 'chatRoomId',
          foreignField: '_id',
          as: 'chatRoomInfo',
        }
      },
      { $unwind: '$chatRoomInfo' },
      { $unwind: '$chatRoomInfo.userIds' },
      // do a join on another table called users, and 
      // get me a user whose _id = userIds
      {
        $lookup: {
          from: 'users',
          localField: 'chatRoomInfo.userIds',
          foreignField: '_id',
          as: 'chatRoomInfo.userProfile',
        }
      },
      { $unwind: '$chatRoomInfo.userProfile' },
      // group data
      {
        $group: {
          _id: '$chatRoomInfo._id',
          postId: { $last: '$_id' },
          chatRoomId: { $last: '$chatRoomInfo._id' },
          message: { $last: '$message' },
          type: { $last: '$type' },
          postedByUser: { $last: '$postedByUser' },
          readByRecipients: { $last: '$readByRecipients' },
          chatRoomInfo: { $addToSet: '$chatRoomInfo.userProfile' },
          createdAt: { $last: '$createdAt' },
          updatedAt: { $last: '$updatedAt' },
        }
      }
    ]);
    return aggregate[0];
  } catch (error) {
    throw error;
  }
}

/**
 * @param {String} chatRoomId - chat room id
 */
chatMessageSchema.statics.getConversationByRoomId = async function (chatRoomId, options = {}) {
  try {
    return this.aggregate([
      { $match: { chatRoomId } },
      { $sort: { createdAt: 1 } },
      // do a join on another table called users, and 
      // get me a user whose _id = postedByUser
      {
        $lookup: {
          from: 'users',
          localField: 'postedByUser',
          foreignField: '_id',
          as: 'postedByUser',
        }
      },
      { $unwind: "$postedByUser" },
      // apply pagination
      { $skip: options.page * options.limit },
      { $limit: options.limit },
      // { $sort: { createdAt: 1 } },
    ]);
  } catch (error) {
    throw error;
  }
}

/**
 * @param {String} chatRoomId - chat room id
 * @param {String} currentUserOnlineId - user id
 */
chatMessageSchema.statics.markMessageRead = async function (chatRoomId, currentUserOnlineId) {
  try {
    return this.updateMany(
      {
        chatRoomId,
        'readByRecipients.readByUserId': { $ne: currentUserOnlineId }
      },
      {
        $addToSet: {
          readByRecipients: { readByUserId: currentUserOnlineId }
        }
      },
      {
        multi: true
      }
    );
  } catch (error) {
    throw error;
  }
}

/**
 * @param {Array} chatRoomIds - chat room ids
 * @param {{ page, limit }} options - pagination options
 * @param {String} currentUserOnlineId - user id
 */
chatMessageSchema.statics.getRecentConversation = async function (chatRoomIds, options, currentUserOnlineId) {
  try {
    return this.aggregate([
      { $match: { chatRoomId: { $in: chatRoomIds } } },
      {
        $group: {
          _id: '$chatRoomId',
          messageId: { $last: '$_id' },
          chatRoomId: { $last: '$chatRoomId' },
          message: { $last: '$message' },
          type: { $last: '$type' },
          postedByUser: { $last: '$postedByUser' },
          createdAt: { $last: '$createdAt' },
          readByRecipients: { $last: '$readByRecipients' },
        }
      },
      { $sort: { createdAt: -1 } },
      // do a join on another table called users, and 
      // get me a user whose _id = postedByUser
      {
        $lookup: {
          from: 'users',
          localField: 'postedByUser',
          foreignField: '_id',
          as: 'postedByUser',
        }
      },
      { $unwind: "$postedByUser" },
      // do a join on another table called chatrooms, and 
      // get me room details
      {
        $lookup: {
          from: 'chatrooms',
          localField: '_id',
          foreignField: '_id',
          as: 'roomInfo',
        }
      },
      { $unwind: "$roomInfo" },
      { $unwind: "$roomInfo.userIds" },
      // do a join on another table called users 
      {
        $lookup: {
          from: 'users',
          localField: 'roomInfo.userIds',
          foreignField: '_id',
          as: 'roomInfo.userProfile',
        }
      },
      { $unwind: "$readByRecipients" },
      // do a join on another table called users 
      {
        $lookup: {
          from: 'users',
          localField: 'readByRecipients.readByUserId',
          foreignField: '_id',
          as: 'readByRecipients.readByUser',
        }
      },

      {
        $group: {
          _id: '$roomInfo._id',
          messageId: { $last: '$messageId' },
          chatRoomId: { $last: '$chatRoomId' },
          message: { $last: '$message' },
          type: { $last: '$type' },
          postedByUser: { $last: '$postedByUser' },
          readByRecipients: { $addToSet: '$readByRecipients' },
          roomInfo: { $addToSet: '$roomInfo.userProfile' },
          createdAt: { $last: '$createdAt' },
        },
      },
      // apply pagination
      { $skip: options.page * options.limit },
      { $limit: options.limit },
    ]);
  } catch (error) {
    throw error;
  }
}


// forwardMessageSchema.statics.postForwardMessage = async function (chatRoomId, message, messageId, forwardByUser, forwardToUser) {
forwardMessageSchema.statics.postForwardMessage = async function (paylodList) {
  try {
    const post = await this.insertMany(paylodList);
    const aggregate = await this.aggregate([
      // get post where _id = post._id
      { $match: { _id: post._id } },
      // do a join on another table called users, and
      // get me a user whose _id = forwardByUser
      {
        $lookup: {
          from: 'users',
          localField: 'forwardByUser',
          foreignField: '_id',
          as: 'forwardByUser',
        }
      },
      { $unwind: '$forwardByUser' },
      // get me a user whose _id = forwardToUser
      // {
      //   $lookup: {
      //     from: 'users',
      //     localField: 'forwardToUser',
      //     foreignField: '_id',
      //     as: 'forwardToUser',
      //   }
      // },
      // { $unwind: '$forwardToUser' },
      // get me a chatRoom whose _id = chatRoomId
      {
        $lookup: {
          from: 'chatrooms',
          localField: 'chatRoomId',
          foreignField: '_id',
          as: 'chatRoomInfo',
        }
      },
      { $unwind: '$chatRoomInfo' },
      // group data
      {
        $group: {
          _id: '$chatRoomInfo._id',
          postId: { $last: '$_id' },
          chatRoomId: { $last: '$chatRoomInfo._id' },
          message: { $last: '$message' },
          type: { $last: '$type' },
          forwardByUser: { $last: '$forwardByUser' },
          forwardToUser: { $last: '$forwardToUser' },
          readByRecipients: { $last: '$readByRecipients' },
          chatRoomInfo: { $addToSet: '$chatRoomInfo.userProfile' },
          createdAt: { $last: '$createdAt' },
          updatedAt: { $last: '$updatedAt' },
        }
      }
    ]);
    return aggregate[0];
    // return post;
  } catch (error) {
    throw error;
  }
}

forwardMessageSchema.statics.getUserForwardedMessage = async function (chatRoomId, options){
  try {
    return this.aggregate([
      // { $match: { forwardToUser: { $in: [userId] } } },
      { $match: { forwardToUser:  {$elemMatch: { chatRoomId: chatRoomId} } } },
      // get me a user whose _id = postedByUser
      {
        $lookup: {
          from: 'users',
          localField: 'forwardByUser',
          foreignField: '_id',
          as: 'forwardByUser',
        }
      },
      { $unwind: "$forwardByUser" },
      // apply pagination
      { $skip: options.page * options.limit },
      { $limit: options.limit },
      { $sort: { createdAt: 1 } },
    ])
  } catch (error) {
    throw error;
  }
}

chatMessageSchema.statics.searchAllMessages = async function(message) {
  try {
    return this.aggregate([
      { $match: { 'message.messageText':  message } },
      // get me a user whose _id = postedByUser
      {
        $lookup: {
          from: 'users',
          localField: 'postedByUser',
          foreignField: '_id',
          as: 'postedByUser',
        }
      },
      { $unwind: "$postedByUser" },
      {
        $lookup: {
          from: 'chatrooms',
          localField: 'chatRoomId',
          foreignField: '_id',
          as: 'chatRoom',
        }
      },
      { $unwind: '$chatRoom' },
      {
        $lookup: {
          from: 'users',
          localField: 'chatRoom.userIds',
          foreignField: '_id',
          as: 'chatRoomUsers',
        }
      },
      { $unwind: '$chatRoomUsers' },
      { $sort: { createdAt: 1 } },
      {
        $group:{
          _id: '$_id',
          postId: { $last: '$_id' },
          chatRoomId: { $last: '$chatRoomInfo._id' },
          message: { $last: '$message' },
          type: { $last: '$type' },
          postedByUser: { $last: '$postedByUser' },
          readByRecipients: { $last: '$readByRecipients' },
          chatRoomInfo: { $addToSet: '$chatRoomInfo.userProfile' },
          createdAt: { $last: '$createdAt' },
          updatedAt: { $last: '$updatedAt' },
          "Users": { "$push": "$chatRoomUsers" },
        }
      }
    ])
  } catch (error) {
    throw error;
  }
}

forwardMessageSchema.statics.searchAllForwardMessages = async function(message) {
  try {
    return this.aggregate([
      { $match: { 'message':  message } },
      // get me a user whose _id = postedByUser
      {
        $lookup: {
          from: 'users',
          localField: 'forwardByUser',
          foreignField: '_id',
          as: 'forwardByUser',
        }
      },
      { $unwind: "$forwardByUser" },
      { $unwind: "$forwardToUser" },
      {
        $lookup: {
          from: 'users',
          localField: 'forwardToUser.userId',
          foreignField: '_id',
          as: 'forwardToUserObject',
        }
      },
      { $unwind: '$forwardToUserObject' },
      { $sort: { createdAt: 1 } },
    ]);
  } catch (error) {
    throw error;
  }
}


const ChatMessageModel = mongoose.model("ChatMessage", chatMessageSchema);
const forwardMessageModel = mongoose.model("ForwardMessage", forwardMessageSchema);
export {
  ChatMessageModel,
    forwardMessageModel
}
