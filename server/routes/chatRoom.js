import express from 'express';
import { upload } from '../middlewares/upload.js';
// controllers
import chatRoom from '../controllers/chatRoom.js';

const router = express.Router();

router
  .get('/', chatRoom.getRecentConversation)
  .post('/search-message', chatRoom.searchAllMessage)
  .get('/:roomId', chatRoom.getConversationByRoomId)
  .post('/initiate', chatRoom.initiate)
  .post('/:roomId/message',upload.array('file'), chatRoom.postMessage)
  .post('/:roomId/forward-message', chatRoom.forwardMessage)
  .put('/:roomId/mark-read', chatRoom.markConversationReadByRoomId)
  // .put('/:chatId/reply-message', chatRoom.replyMessage)


export default router;
