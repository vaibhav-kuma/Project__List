import { Router } from 'express';
import {
  getFriends,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
  getPendingRequests,
  toggleFavorite,
  updateFriendNotes,
  getCallHistory,
  startFriendCall,
} from '../controllers/friendController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getFriends);
router.get('/pending', authenticate, getPendingRequests);
router.post('/request', authenticate, sendFriendRequest);
router.post('/:friendId/accept', authenticate, acceptFriendRequest);
router.post('/:friendId/reject', authenticate, rejectFriendRequest);
router.delete('/:friendId', authenticate, removeFriend);
router.post('/block', authenticate, blockUser);
router.post('/unblock', authenticate, unblockUser);
router.post('/:friendId/favorite', authenticate, toggleFavorite);
router.put('/:friendId/notes', authenticate, updateFriendNotes);
router.get('/:friendId/calls', authenticate, getCallHistory);
router.post('/:friendId/call', authenticate, startFriendCall);

export default router;
