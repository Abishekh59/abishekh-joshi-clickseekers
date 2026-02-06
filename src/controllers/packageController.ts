import { Request, Response } from 'express';
import prisma from '../model/index';
import catchAsync from '../utils/catchAsync';

// Create a new package for a photographer
export const createPackage = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser || authUser.role !== 'PHOTOGRAPHER') {
    return res.status(403).json({ success: false, message: 'Only photographers can create packages' });
  }
  const { name, description, price, features, duration, most_popular } = req.body;
  if (!name || !price) {
    return res.status(400).json({ success: false, message: 'Name and price are required' });
  }
  if (most_popular) {
    // Unset most_popular for all other packages
    await prisma.package.updateMany({
      where: { most_popular: true },
      data: { most_popular: false },
    });
  }
  const newPackage = await prisma.package.create({
    data: {
      photographer_id: authUser.user_id,
      name,
      description: description || null,
      price,
      features: Array.isArray(features) ? features.join(', ') : features || null,
      duration: duration || null,
      most_popular: !!most_popular,
    },
  });
  res.status(201).json({ success: true, data: newPackage });
});

// Get all packages for a photographer
export const getPhotographerPackages = catchAsync(async (req: Request, res: Response) => {
  const { photographer_id } = req.params;
  if (!photographer_id) {
    return res.status(400).json({ success: false, message: 'photographer_id is required' });
  }
  const packages = await prisma.package.findMany({
    where: { photographer_id },
    orderBy: { price: 'asc' },
  });
  res.json({ success: true, data: packages });
});

// Get a single package by id
export const getPackageById = catchAsync(async (req: Request, res: Response) => {
  const { package_id } = req.params;
  const pkg = await prisma.package.findUnique({ where: { package_id: Number(package_id) } });
  if (!pkg) {
    return res.status(404).json({ success: false, message: 'Package not found' });
  }
  res.json({ success: true, data: pkg });
});

// Update a package (photographer only)
export const updatePackage = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const { package_id } = req.params;
  const { name, description, price, features, duration, most_popular } = req.body;
  const pkg = await prisma.package.findUnique({ where: { package_id: Number(package_id) } });
  if (!pkg || pkg.photographer_id !== authUser.user_id) {
    return res.status(403).json({ success: false, message: 'Not authorized or package not found' });
  }
  if (most_popular) {
    // Unset most_popular for all other packages
    await prisma.package.updateMany({
      where: { most_popular: true },
      data: { most_popular: false },
    });
  }
  const updated = await prisma.package.update({
    where: { package_id: Number(package_id) },
    data: {
      name,
      description,
      price,
      features: Array.isArray(features) ? features.join(', ') : features || null,
      duration: duration || null,
      most_popular: !!most_popular,
    },
  });
  res.json({ success: true, data: updated });
});

// Delete a package (photographer only)
export const deletePackage = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const { package_id } = req.params;
  const pkg = await prisma.package.findUnique({ where: { package_id: Number(package_id) } });
  if (!pkg || pkg.photographer_id !== authUser.user_id) {
    return res.status(403).json({ success: false, message: 'Not authorized or package not found' });
  }
  // Check for active bookings referencing this package
  const activeBooking = await prisma.booking.findFirst({
    where: {
      package_id: Number(package_id),
      // You may want to adjust this filter based on your BookingStatus model
      // For now, we assume any booking referencing this package blocks deletion
    },
  });
  if (activeBooking) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete package: there are bookings using this package. Please finish the booking(s) before deleting the package.'
    });
  }
  try {
    await prisma.package.delete({ where: { package_id: Number(package_id) } });
    res.json({ success: true, message: 'Package deleted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete package', error: error.message });
  }
});
