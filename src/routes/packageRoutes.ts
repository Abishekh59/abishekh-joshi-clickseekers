import express from 'express';
import { createPackage, getPhotographerPackages, getPackageById, updatePackage, deletePackage } from '../controllers/packageController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Create a new package (photographer only)
router.post('/createPackage', authenticate, createPackage);

// Get all packages for a photographer
router.get('/photographer/:photographer_id', getPhotographerPackages);

// Get a single package by id
router.get('/:package_id', getPackageById);

// Update a package (photographer only)
router.put('/:package_id', authenticate, updatePackage);

// Delete a package (photographer only)
router.delete('/:package_id', authenticate, deletePackage);

export default router;
