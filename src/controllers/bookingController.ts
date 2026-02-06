import { Request, Response } from 'express';
import prisma from '../model/index';
import catchAsync from '../utils/catchAsync';

// Book a photographer
export const createBooking = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { photographer_id, date, end_date, event_type, amount, notes, location, package_id } = req.body;

  if (!photographer_id || !date || !amount || !location || !package_id) {
    return res.status(400).json({ success: false, message: 'Missing required fields (photographer_id, date, amount, location, package_id are required)' });
  }

  // Check if photographer exists and is a PHOTOGRAPHER
  const photographer = await prisma.user.findUnique({
    where: { user_id: photographer_id },
  });
  if (!photographer || photographer.role !== 'PHOTOGRAPHER') {
    return res.status(404).json({ success: false, message: 'Photographer not found' });
  }

  // Check if package exists and belongs to the photographer
  const pkg = await prisma.package.findUnique({
    where: { package_id: Number(package_id) },
  });
  if (!pkg || pkg.photographer_id !== photographer_id) {
    return res.status(400).json({ success: false, message: 'Invalid package for this photographer' });
  }

  // Find status_id for 'PENDING'
  const pendingStatus = await prisma.bookingStatus.findUnique({
    where: { status_name: 'PENDING' },
  });
  if (!pendingStatus) {
    return res.status(500).json({ success: false, message: 'Booking status not found' });
  }

  // Create booking using status_id and package_id
  const booking = await prisma.booking.create({
    data: {
      client_id: authUser.user_id,
      photographer_id,
      event_date: new Date(date),
      end_date: end_date ? new Date(end_date) : null,
      event_type: event_type || null,
      location,
      amount,
      notes: notes || null,
      status_id: pendingStatus.status_id,
      package_id: Number(package_id),
    } as any,
  });

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: booking,
  });
});

// Get all bookings for the logged-in user
export const getMyBookings = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        { client_id: authUser.user_id },
        { photographer_id: authUser.user_id },
      ],
    },
    include: {
      client: {
        select: {
          user_id: true,
          full_name: true,
          profile_image: true,
        },
      },
      photographer: {
        select: {
          user_id: true,
          full_name: true,
          profile_image: true,
        },
      },
      status: true,
      package: true,
    },
    orderBy: { event_date: 'desc' },
  });

  res.json({ success: true, data: bookings });
});

// Photographer or client can update booking status (ACCEPTED, REJECTED, COMPLETED, CANCELLED)
export const updateBookingStatus = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user;
  if (!authUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { booking_id, status } = req.body;
  const allowedStatuses = ['ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'];
  if (!booking_id || !allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid booking_id or status' });
  }

  // Find booking
  const booking = await prisma.booking.findUnique({ where: { booking_id } });
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  // Only client or photographer can update
  if (
    booking.client_id !== authUser.user_id &&
    booking.photographer_id !== authUser.user_id
  ) {
    return res.status(403).json({ success: false, message: 'Not authorized to update this booking' });
  }

  // Find the BookingStatus id for the new status
  const bookingStatus = await prisma.bookingStatus.findUnique({
    where: { status_name: status },
  });
  if (!bookingStatus) {
    return res.status(400).json({ success: false, message: 'Invalid status value' });
  }

  const updated = await prisma.booking.update({
    where: { booking_id },
    data: {
      status: {
        connect: { status_name: status },
      },
    },
  });

  res.json({ success: true, message: 'Booking status updated', data: updated });
});
