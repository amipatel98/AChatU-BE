// utils
import makeValidation from '@withvoid/make-validation';
// models
import ChatRoomModel from '../models/ChatRoom.js';
import { ChatMessageModel, forwardMessageModel } from '../models/ChatMessage.js';
import UserModel from '../models/User.js';

export default {
  initiate: async (req, res) => {
    try {
      const validation = makeValidation(types => ({
        payload: req.body,
        checks: {
          userIds: { 
            type: types.array, 
            options: { unique: true, empty: false, stringOnly: true } 
          },
        }
      }));
      if (!validation.success) return res.status(400).json({ ...validation });

      const { userIds } = req.body;
      const { userId: chatInitiator } = req;
      const allUserIds = [...userIds, chatInitiator];
      const chatRoom = await ChatRoomModel.initiateChat(allUserIds, chatInitiator);
      return res.status(200).json({ success: true, chatRoom });
    } catch (error) {
      return res.status(500).json({ success: false, error: error })
    }
  },
  postMessage: async (req, res) => {
    try {
      let imageArray = [];
      if(req.files) {
        req.files.forEach((item) => {
          imageArray.push({
            imageName: item.filename,
            imagePath: item.path,
          })
        })
      }
      const { roomId } = req.params;
      const validation = makeValidation(types => ({
        payload: req.body,
        checks: {
          // messageText: { type: types.string },
        }
      }));
      if (!validation.success) return res.status(400).json({ ...validation });

      const messagePayload = {
        messageText: req.body.messageText,
        replyMessageText: req.body.replyMessageText || '',
        replyMessageId: req.body.replyMessageId || ''
      };


      const currentLoggedUser = req.userId;
      const post = await ChatMessageModel.createPostInChatRoom(roomId, messagePayload, imageArray, currentLoggedUser);
      global.io.sockets.emit('message', messagePayload);
      // global.io.sockets.in(roomId).emit('message', messagePayload );
      return res.status(200).json({ success: true, post });
    } catch (error) {
      console.log('error', error);
      return res.status(500).json({ success: false, error: error })
    }
  },
  forwardMessage: async (req, res) => {
    try {
      const { roomId } = req.params;
      // const messagePayload = {
      //   messageText: req.body.messageText,
      //   messageId: req.body.messageId,
      //   user: req.body.user
      // };
      // const currentLoggedUser = req.userId;
      // const postforwardMessage = await forwardMessageModel.postForwardMessage(roomId, messagePayload.messageText, messagePayload.messageId ,currentLoggedUser, messagePayload.user);
      const postForwardMessage = await forwardMessageModel.postForwardMessage(req.body);
      // global.io.sockets.in(roomId).emit('forward message', { message: postForwardMessage });
      global.io.sockets.emit('message', req.body);
      return res.status(200).json({ success: true, postForwardMessage });
    } catch (error) {
      return res.status(500).json({ success: false, error: error })
    }
  },
  getRecentConversation: async (req, res) => {
    try {
      const currentLoggedUser = req.userId;
      const options = {
        page: parseInt(req.query.page) || 0,
        limit: parseInt(req.query.limit) || 10,
      };
      const rooms = await ChatRoomModel.getChatRoomsByUserId(currentLoggedUser);
      const roomIds = rooms.map(room => room._id);
      const recentConversation = await ChatMessageModel.getRecentConversation(
        roomIds, options, currentLoggedUser
      );
      return res.status(200).json({ success: true, conversation: recentConversation });
    } catch (error) {
      return res.status(500).json({ success: false, error: error })
    }
  },
  searchAllMessage: async (req, res) => {
    try {
      console.log('req.body', req.body.message);
      const searchMessage = await ChatMessageModel.searchAllMessages(req.body.message);
      const forwardMessage = await forwardMessageModel.searchAllForwardMessages(req.body.message);
      let message = [...searchMessage];
      message = message.concat(forwardMessage);
      return res.status(200).json({ success: true, conversation: message });
    } catch (error) {
      console.log('error', error);
      return res.status(500).json({ success: false, error: error })
    }
  },
  getConversationByRoomId: async (req, res) => {
    try {
      const currentLoggedUser = req.userId;
      const { roomId } = req.params;
      const room = await ChatRoomModel.getChatRoomByRoomId(roomId)
      if (!room) {
        return res.status(400).json({
          success: false,
          message: 'No room exists for this id',
        })
      }
      const users = await UserModel.getUserByIds(room.userIds);
      const options = {
        page: parseInt(req.query.page) || 0,
        limit: parseInt(req.query.limit) || 1000
      };
      const conversation1 = await ChatMessageModel.getConversationByRoomId(roomId, options);
      const forwardedConversation = await forwardMessageModel.getUserForwardedMessage(roomId, options);
      let conversation = [...conversation1];
      conversation = conversation.concat(forwardedConversation);
      conversation.sort(function(x, y){
        return x.createdAt - y.createdAt;
      })
      return res.status(200).json({
        success: true,
        conversation,
        users,
      });
    } catch (error) {
      console.log('error', error);
      return res.status(500).json({ success: false, error });
    }
  },
  markConversationReadByRoomId: async (req, res) => {
    try {
      const { roomId } = req.params;
      const room = await ChatRoomModel.getChatRoomByRoomId(roomId)
      if (!room) {
        return res.status(400).json({
          success: false,
          message: 'No room exists for this id',
        })
      }

      const currentLoggedUser = req.userId;
      const result = await ChatMessageModel.markMessageRead(roomId, currentLoggedUser);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error });
    }
  },
}
