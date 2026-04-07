import { Router } from 'express';
import {
    deleteAvailability,
    getAvailability,
    setAvailability,
} from '../controllers/availabilityController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public route - get photographer availability
router.get('/:photographerId', getAvailability);

// Protected routes - photographer only
router.post('/', authenticate, setAvailability);
router.delete('/', authenticate, deleteAvailability);

export default router;
