import { Request, Response } from 'express';
import prisma from '../model/index';
import catchAsync from '../utils/catchAsync';
import { getFullImageUrl } from '../utils/imageUtils';

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

  // --- NEW VALIDATIONS ---

  // 1. Validate Date format (Fixes Prisma "Invalid Date" error)
  const eventDate = new Date(date);
  if (isNaN(eventDate.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid date format' });
  }

  // Normalize date for comparison (removing time component)
  const normalizedEventDate = new Date(eventDate);
  normalizedEventDate.setHours(0, 0, 0, 0);

  // 2. Prevent past dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (normalizedEventDate < today) {
    return res.status(400).json({ success: false, message: 'Cannot book a date in the past' });
  }

  // 3. Validate end_date logic if provided
  let parsedEndDate = null;
  if (end_date) {
    parsedEndDate = new Date(end_date);
    if (isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid end date format' });
    }
    if (parsedEndDate < eventDate) {
      return res.status(400).json({ success: false, message: 'End date must be at or after the event date' });
    }
  }

  // 4. Availability Check: Check if photographer has manually blocked this date
  const isBlocked = await prisma.photographerAvailability.findFirst({
    where: {
      photographer_id,
      blocked_date: normalizedEventDate,
    }
  });

  if (isBlocked) {
    return res.status(400).json({ success: false, message: 'Photographer has marked this date as unavailable' });
  }

  // 5. Availability Check: Check for existing accepted bookings on this date
  // Note: We only block if the status is ACCEPTED or COMPLETED.
  const existingBooking = await prisma.booking.findFirst({
    where: {
      photographer_id,
      event_date: normalizedEventDate,
      status: {
        status_name: {
          in: ['ACCEPTED', 'COMPLETED']
        }
      }
    }
  });

  if (existingBooking) {
    return res.status(400).json({ success: false, message: 'Photographer is already booked on this date' });
  }

  // --- END NEW VALIDATIONS ---

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
      event_date: normalizedEventDate,
      end_date: parsedEndDate,
      event_type: event_type || null,
      location,
      amount,
      notes: notes || null,
      status_id: pendingStatus.status_id,
      package_id: Number(package_id),
    } as any,
  });

  // Create Notification for photographer
  const client = await prisma.user.findUnique({ where: { user_id: authUser.user_id }, select: { full_name: true } });
  const notification = await prisma.notification.create({
    data: {
      user_id: photographer_id,
      title: 'New Booking Request',
      type: 'BOOKING',
      message: `${client?.full_name || 'A client'} has requested a booking for ${date}`,
      is_read: false
    }
  });

  // Emit socket event
  const io = (req as any).io;
  if (io) {
    const normalizedPhotographerId = String(photographer_id).toLowerCase();
    io.to(normalizedPhotographerId).emit('new_notification', {
      ...notification,
      userId: photographer_id
    });
    io.to(normalizedPhotographerId).emit('new_booking', {
      ...booking,
      client: client?.full_name || 'Client',
      event: event_type || 'Photography Session'
    });
  }

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
      payment: {
        include: {
          status: true,
          method: true
        }
      }
    },
    orderBy: { event_date: 'desc' },
  });

  console.log(`Fetched ${bookings.length} bookings for user ${authUser.user_id}`);
  if (bookings.length > 0) {
    console.log("Sample booking payment status:", JSON.stringify(bookings[0].payment, null, 2));
  }

  res.json({
    success: true,
    data: bookings.map((b: any) => ({
      ...b,
      client: b.client ? {
        ...b.client,
        profile_image: getFullImageUrl(b.client.profile_image)
      } : null,
      photographer: b.photographer ? {
        ...b.photographer,
        profile_image: getFullImageUrl(b.photographer.profile_image)
      } : null,
      payment_status: b.payment?.status?.status_name || 'PENDING'
    }))
  });
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

  // Award or deduct points based on status change
  const { awardPoints, POINT_CONFIG, awardBookingPoints } = await import('../services/pointsService');

  if (status === 'ACCEPTED') {
    // Award points to photographer for accepting booking
    await awardPoints({
      userId: booking.photographer_id,
      points: POINT_CONFIG.BOOKING_ACCEPTED,
      reason: `Booking accepted (ID: ${booking_id})`
    });
  } else if (status === 'COMPLETED') {
    // Award points to photographer for completing booking
    await awardBookingPoints(booking.photographer_id, booking_id);
  } else if (status === 'CANCELLED') {
    // Deduct points if photographer cancels
    if (authUser.user_id === booking.photographer_id) {
      await awardPoints({
        userId: booking.photographer_id,
        points: POINT_CONFIG.BOOKING_CANCELLED_BY_PHOTOGRAPHER,
        reason: `Booking cancelled by photographer (ID: ${booking_id})`
      });
    }
    // No point change if client cancels
  }

  // Create Notification for the other party
  const io = (req as any).io;
  const isPhotographer = authUser.user_id === booking.photographer_id;
  const targetUserId = isPhotographer ? booking.client_id : booking.photographer_id;
  const updaterName = (await prisma.user.findUnique({ where: { user_id: authUser.user_id }, select: { full_name: true } }))?.full_name || 'Someone';

  const statusNotification = await prisma.notification.create({
    data: {
      user_id: targetUserId,
      title: 'Booking Updated',
      type: 'BOOKING',
      message: `${updaterName} has marked your booking as ${status}`,
      is_read: false
    }
  });

  if (io) {
    const normalizedTargetId = String(targetUserId).toLowerCase();
    io.to(normalizedTargetId).emit('new_notification', {
      ...statusNotification,
      userId: targetUserId
    });
  }

  res.json({ success: true, message: 'Booking status updated', data: updated });
});
