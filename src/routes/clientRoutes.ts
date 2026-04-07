import { Router } from 'express';
import {
  getFavoritePhotographers,
  getFavoritePhotographerIds,
  togglePhotographerSave
} from '../controllers/photographerController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Favorite Photographers routes
router.get('/favorites', authenticate, requireRole('CLIENT'), getFavoritePhotographers);
router.get('/favorites/ids', authenticate, requireRole('CLIENT'), getFavoritePhotographerIds);
router.patch('/favorites/:photographerId', authenticate, requireRole('CLIENT'), togglePhotographerSave);

export default router;
