import { Router } from 'express';
import {
  addPortfolioImage,
  deletePortfolioImage,
  getAnalytics,
  getDashboardStats,
  getEarnings,
  getMyReviews,
  getNotifications,
  getPhotographerByIdWithRecentPortfolios,
  getPortfolioImageBinary,
  getTopPhotographers,
  listAllPhotographersWithRecentPortfolios,
  listMyPortfolioImages,
  listPhotographerPortfolioImagesPublic,
  markNotificationAsRead,
  replyToReview,
  submitReview,
  updatePortfolioImage
} from '../controllers/photographerController';
import { authenticate, requireRole } from '../middleware/auth';
// Public route to get all photographers with their details and recent portfolio images

import { addComment, deleteComment, getComments, updateComment } from '../controllers/commentController';
import { getDashboardFeed, incrementImageLike, incrementImageView } from '../controllers/feedController';
import { uploadPortfolioImage } from '../middleware/upload';

const router = Router();

router.post('/portfolio/images', authenticate, requireRole('PHOTOGRAPHER'), uploadPortfolioImage.single('image'), addPortfolioImage);
router.get('/dashboard/stats', authenticate, requireRole('PHOTOGRAPHER'), getDashboardStats);
router.get('/notifications', authenticate, getNotifications);
router.patch('/notifications/:notificationId/read', authenticate, markNotificationAsRead);
router.get('/earnings', authenticate, requireRole('PHOTOGRAPHER'), getEarnings);
router.get('/analytics', authenticate, requireRole('PHOTOGRAPHER'), getAnalytics);
router.get('/portfolio/images', authenticate, requireRole('PHOTOGRAPHER'), listMyPortfolioImages);
router.patch('/portfolio/images/:imageId', authenticate, requireRole('PHOTOGRAPHER'), updatePortfolioImage);
router.delete('/portfolio/images/:imageId', authenticate, requireRole('PHOTOGRAPHER'), deletePortfolioImage);
router.get('/:photographerId/portfolio/images', listPhotographerPortfolioImagesPublic);
router.get('/portfolio/image/:imageId', getPortfolioImageBinary);
router.get('/feed', getDashboardFeed);
router.get('/top', getTopPhotographers);
router.patch('/portfolio/images/:imageId/view', incrementImageView);
router.patch('/portfolio/images/:imageId/like', incrementImageLike);
router.get('/reviews', authenticate, requireRole('PHOTOGRAPHER'), getMyReviews);
router.post('/reviews/:reviewId/reply', authenticate, requireRole('PHOTOGRAPHER'), replyToReview);
router.post('/review', authenticate, requireRole('CLIENT'), submitReview);
router.get('/allPhotographer', listAllPhotographersWithRecentPortfolios);
router.get('/:photographerId', getPhotographerByIdWithRecentPortfolios);

// Comment routes
router.post('/portfolio/images/:imageId/comments', authenticate, addComment);
router.get('/portfolio/images/:imageId/comments', getComments);
router.patch('/portfolio/images/:imageId/comments/:commentId', authenticate, updateComment);
router.delete('/portfolio/images/:imageId/comments/:commentId', authenticate, deleteComment);

export default router;

