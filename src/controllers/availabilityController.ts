import { Request, Response } from 'express';
import prisma from '../model/index';

/**
 * Get all blocked dates for a photographer
 * GET /api/availability/:photographerId
 */
export const getAvailability = async (req: Request, res: Response) => {
    try {
        const { photographerId } = req.params;

        // 1. Fetch manual blocks from PhotographerAvailability
        const manualAvailability = await prisma.photographerAvailability.findMany({
            where: {
                photographer_id: photographerId,
            },
            orderBy: {
                blocked_date: 'asc',
            },
        });

        // 2. Fetch active bookings (ACCEPTED, COMPLETED) from Booking
        const bookings = await prisma.booking.findMany({
            where: {
                photographer_id: photographerId,
                status: {
                    status_name: {
                        in: ['ACCEPTED', 'COMPLETED']
                    }
                }
            },
            select: {
                booking_id: true,
                event_date: true,
                end_date: true,
                event_type: true,
                created_at: true
            }
        });

        // Helper to get all dates between two dates (inclusive)
        const getDatesInRange = (startDate: Date, endDate: Date) => {
            const dates = [];
            const curr = new Date(startDate);
            curr.setHours(0, 0, 0, 0);
            const last = new Date(endDate);
            last.setHours(0, 0, 0, 0);
            
            while (curr <= last) {
                dates.push(curr.toISOString().split('T')[0]);
                curr.setDate(curr.getDate() + 1);
            }
            return dates;
        };

        // Format manual blocks
        const formattedManual = manualAvailability.map((item: any) => ({
            id: item.availability_id,
            date: item.blocked_date.toISOString().split('T')[0],
            reason: item.reason || '',
            created_at: item.created_at,
            type: 'MANUAL'
        }));

        // Convert bookings into blocked dates (handling ranges)
        const bookingBlocks: any[] = [];
        bookings.forEach((booking: any) => {
            const dates = getDatesInRange(booking.event_date, booking.end_date || booking.event_date);
            
            dates.forEach(dateStr => {
                bookingBlocks.push({
                    id: `booking-${booking.booking_id}-${dateStr}`,
                    date: dateStr,
                    reason: `Booked: ${booking.event_type || 'Photography Session'}`,
                    created_at: booking.created_at,
                    type: 'BOOKING'
                });
            });
        });

        // Combine logic: Manual blocks take precedence over booking-derived blocks for the same date
        const combined = [...formattedManual];
        const manualDateSet = new Set(formattedManual.map((m: any) => m.date));

        bookingBlocks.forEach((b: any) => {
            if (!manualDateSet.has(b.date)) {
                combined.push(b);
            }
        });

        // Final sort by date
        combined.sort((a, b) => a.date.localeCompare(b.date));

        res.json({
            success: true,
            data: combined,
        });
    } catch (error: any) {
        console.error('Get availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch availability',
            error: error.message,
        });
    }
};

/**
 * Save/update photographer availability (bulk operation)
 * POST /api/availability
 * Body: { dates: [{ date: 'YYYY-MM-DD', reason: 'string' }] }
 */
export const setAvailability = async (req: Request, res: Response) => {
    try {
        const photographerId = req.user?.user_id;
        if (!photographerId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const { dates } = req.body;

        if (!Array.isArray(dates) || dates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Dates array is required',
            });
        }

        // Delete all existing availability for this photographer
        await prisma.photographerAvailability.deleteMany({
            where: {
                photographer_id: photographerId,
            },
        });

        // Insert new availability dates
        const availabilityData = dates.map((item: { date: string; reason?: string }) => ({
            photographer_id: photographerId,
            blocked_date: new Date(item.date),
            reason: item.reason || null,
        }));

        await prisma.photographerAvailability.createMany({
            data: availabilityData,
            skipDuplicates: true,
        });

        res.json({
            success: true,
            message: 'Availability updated successfully',
        });
    } catch (error: any) {
        console.error('Set availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update availability',
            error: error.message,
        });
    }
};

/**
 * Delete specific blocked dates
 * DELETE /api/availability
 * Body: { dates: ['YYYY-MM-DD', 'YYYY-MM-DD'] }
 */
export const deleteAvailability = async (req: Request, res: Response) => {
    try {
        const photographerId = req.user?.user_id;
        if (!photographerId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const { dates } = req.body;

        if (!Array.isArray(dates) || dates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Dates array is required',
            });
        }

        const datesToDelete = dates.map((dateStr: string) => new Date(dateStr));

        await prisma.photographerAvailability.deleteMany({
            where: {
                photographer_id: photographerId,
                blocked_date: {
                    in: datesToDelete,
                },
            },
        });

        res.json({
            success: true,
            message: 'Dates removed successfully',
        });
    } catch (error: any) {
        console.error('Delete availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete availability',
            error: error.message,
        });
    }
};
