import ChatRoomModel from '../models/ChatRoom.js';
import { ChatMessageModel, forwardMessageModel } from '../models/ChatMessage.js';

export default {
  deleteRoomById: async (req, res) => {
    try {
      const { roomId } = req.params;
      const room = await ChatRoomModel.remove({ _id: roomId });
      const messages = await ChatMessageModel.remove({ chatRoomId: roomId })
      return res.status(200).json({
        success: true, 
        message: "Operation performed successfully",
        deletedRoomsCount: room.deletedCount,
        deletedMessagesCount: messages.deletedCount,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error })
    }
  },
  deleteEveryMessageById: async (req, res) => {
    try {
      const { messageId } = req.params;
      const message = await ChatMessageModel.deleteMany({ _id: messageId });
      const replyMessage = await ChatMessageModel.deleteMany({ 'message.replyMessageId': messageId });
      const forwardMessage = await forwardMessageModel.deleteMany({messageId: messageId });
      const deletedId = {
        messageId: messageId,
        replyMessageId: replyMessage,
        forwardMessageId: forwardMessage
      }
      global.io.sockets.emit('message', deletedId);
      return res.status(200).json({
        success: true, 
        deletedMessagesCount: message.deletedCount || 0 + forwardMessage.deletedCount || 0 + replyMessage.deletedCount || 0 ,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: error })
    }
  },
  deleteMessageById: async (req, res) => {
    try {
      const { messageId } = req.params;
      const message = await ChatMessageModel.remove({ _id: messageId });
      const forwardMessage = await forwardMessageModel.deleteMany({ _id: messageId });
      const deletedId = {
        messageId: message,
        forwardMessageId: forwardMessage
      }
      global.io.sockets.emit('message', deletedId);
      return res.status(200).json({
        success: true,
        deletedMessagesCount: message.deletedCount + forwardMessage.deletedCount,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: error })
    }
  },

}
