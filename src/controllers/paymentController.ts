
import axios from 'axios';
import { Request, Response } from 'express';
import prisma from '../model/index';
import catchAsync from '../utils/catchAsync';

export const initiatePayment = catchAsync(async (req: Request, res: Response) => {
    const authUser = req.user;
    if (!authUser) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { booking_id, amount, return_url, website_url } = req.body;

    if (!booking_id || !amount || !return_url || !website_url) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // specific backend implementation

    // Fetch full user details including name and phone
    const user = await prisma.user.findUnique({
        where: { user_id: authUser.user_id }
    });

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const payload = {
        "return_url": return_url,
        "website_url": website_url,
        "amount": Math.floor(Number(amount)), // Ensure integer (paisa)
        "purchase_order_id": String(booking_id),
        "purchase_order_name": `Booking #${booking_id}`,
        "customer_info": {
            "name": user.full_name || "Client",
            "email": user.email || "example@email.com",
            "phone": user.phone || "9800000000"
        },
        "product_details": [
            {
                "identity": String(booking_id),
                "name": `Booking #${booking_id}`,
                "total_price": Math.floor(Number(amount)),
                "quantity": 1,
                "unit_price": Math.floor(Number(amount))
            }
        ]
    };

    console.log("Khalti Payload:", JSON.stringify(payload, null, 2));

    // Debug logging to a file for easier access
    try {
        const fs = require('fs');
        const logEntry = `\n--- DEBUG: INITIATE REQUEST at ${new Date().toISOString()} ---\nPayload: ${JSON.stringify(payload, null, 2)}\n`;
        fs.appendFileSync('/tmp/khalti_responses.log', logEntry);
    } catch (err) {
        console.error("Failed to write log file:", err);
    }

    try {
        const response = await axios.post('https://dev.khalti.com/api/v2/epayment/initiate/', payload, {
            headers: {
                'Authorization': `key ${process.env.KHALTI_SECRET_KEY}`,
                'Content-Type': 'application/json',
            }
        });

        res.json({
            success: true,
            data: response.data
        });
    } catch (error: any) {
        console.error('Khalti Initiation Error Details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            headers: error.response?.headers
        });
        res.status(500).json({
            success: false,
            message: 'Failed to initiate payment',
            error: error.response?.data || error.message
        });
    }
});

export const verifyPayment = catchAsync(async (req: Request, res: Response) => {
    const { pidx, booking_id: providedBookingId } = req.body;

    // Debug logging to a file for easier access
    try {
        const fs = require('fs');
        const logEntry = `\n--- DEBUG: VERIFY REQUEST at ${new Date().toISOString()} ---\nBody: ${JSON.stringify(req.body, null, 2)}\n`;
        fs.appendFileSync('/tmp/khalti_responses.log', logEntry);
    } catch (err) {
        console.error("Failed to write log file:", err);
    }

    console.log("[PaymentVerify] Raw Request Body:", JSON.stringify(req.body));
    console.log("[PaymentVerify] Received verification request for pidx:", pidx, "Provided Booking ID:", providedBookingId);

    if (!pidx) {
        console.warn("[PaymentVerify] Missing pidx in request body");
        return res.status(400).json({ success: false, message: 'Missing pidx' });
    }

    try {
        console.log("[PaymentVerify] Querying Khalti for status...");
        const response = await axios.post('https://dev.khalti.com/api/v2/epayment/lookup/', { pidx }, {
            headers: {
                'Authorization': `key ${process.env.KHALTI_SECRET_KEY}`,
                'Content-Type': 'application/json',
            }
        });

        const data = response.data;
        console.log("[PaymentVerify] Khalti Lookup Full Response:", JSON.stringify(data, null, 2));

        // Khalti status can be 'Completed' or 'SUCCESS' depending on API version/environment
        const normalizedStatus = String(data.status).toUpperCase();
        console.log("[PaymentVerify] Normalized Status:", normalizedStatus);

        // Debug logging to a file since terminal output is hard to access
        try {
            const fs = require('fs');
            const logEntry = `\n--- ${new Date().toISOString()} ---\n${JSON.stringify(data, null, 2)}\n`;
            fs.appendFileSync('/tmp/khalti_responses.log', logEntry);
        } catch (err) {
            console.error("Failed to write log file:", err);
        }

        const khaltiOrderId = data.purchase_order_id || data.order_id;
        console.log("[PaymentVerify] Khalti Order ID from response:", khaltiOrderId);

        let bookingId: number | null = null;

        // 1. Try Khalti Order ID
        if (khaltiOrderId) {
            const parsed = Number(String(khaltiOrderId).replace(/\D/g, ''));
            if (!isNaN(parsed) && parsed > 0) bookingId = parsed;
        }

        // 2. Fallback to providedBookingId
        if (!bookingId && providedBookingId) {
            const parsed = typeof providedBookingId === 'number' ? providedBookingId : Number(String(providedBookingId).replace(/\D/g, ''));
            if (!isNaN(parsed) && parsed > 0) bookingId = parsed;
        }

        if (normalizedStatus === 'COMPLETED' || normalizedStatus === 'SUCCESS') {
            console.log("[PaymentVerify] Payment SUCCESS. Khalti OrderID:", khaltiOrderId, "Provided ID:", providedBookingId, "Final Parsed ID:", bookingId);

            if (!bookingId) {
                console.error("[PaymentVerify] Could not determine Booking ID from either Khalti or request body");
                return res.status(400).json({ success: false, message: 'Invalid payment response: missing or invalid booking ID' });
            }

            if (bookingId > 0) {
                let transactionSuccess = false;
                await prisma.$transaction(async (tx) => {
                    // 1. Fetch booking details first
                    const booking = await tx.booking.findUnique({
                        where: { booking_id: bookingId },
                        include: {
                            status: true,
                            photographer: {
                                include: {
                                    rewards: {
                                        include: { badge: true }
                                    }
                                }
                            }
                        }
                    });

                    if (!booking) {
                        console.error("[PaymentVerify] Booking not found for ID:", bookingId);
                        return;
                    }

                    // 2. Check if payment already recorded
                    const existingPayment = await tx.payment.findUnique({
                        where: { booking_id: bookingId }
                    });

                    if (!existingPayment) {
                        console.log("[PaymentVerify] Recording new payment record for booking:", bookingId);

                        // Fetch or create method and status
                        const [khaltiMethod, completedStatus] = await Promise.all([
                            tx.paymentMethod.upsert({
                                where: { method_name: 'KHALTI' },
                                update: {},
                                create: { method_name: 'KHALTI' }
                            }),
                            tx.paymentStatus.upsert({
                                where: { status_name: 'COMPLETED' },
                                update: {},
                                create: { status_name: 'COMPLETED' }
                            })
                        ]);

                        // 3. Calculate Commission
                        const totalAmount = Number(data.total_amount) / 100;
                        let feePercentage = 10; // Default for Beginner

                        const badge = booking.photographer.rewards?.badge;

                        if (badge) {
                            feePercentage = Number((badge as any).commission_percentage);
                        }

                        const commissionAmount = (totalAmount * feePercentage) / 100;
                        const photographerAmount = totalAmount - commissionAmount;

                        const paymentRecord = await tx.payment.create({
                            data: {
                                booking_id: bookingId,
                                amount: totalAmount,
                                paid_at: new Date(),
                                method_id: khaltiMethod.method_id,
                                status_id: completedStatus.status_id,
                                platform_fee_percentage: feePercentage,
                                commission_amount: commissionAmount,
                                photographer_amount: photographerAmount
                            }
                        });
                        console.log("[PaymentVerify] Payment record created with commission info:", {
                            payment_id: paymentRecord.payment_id,
                            fee: `${feePercentage}%`,
                            commission: commissionAmount,
                            photographerReceipt: photographerAmount
                        });
                    } else {
                        console.log("[PaymentVerify] Payment record already exists for booking:", bookingId);
                    }

                    // 4. Update booking status to ACCEPTED
                    if (booking) {
                        console.log("[PaymentVerify] Current booking status:", booking.status.status_name);
                        if (booking.status.status_name !== 'ACCEPTED') {
                            await tx.booking.update({
                                where: { booking_id: bookingId },
                                data: {
                                    status: {
                                        connect: { status_name: 'ACCEPTED' }
                                    }
                                }
                            });
                            console.log("[PaymentVerify] Booking status updated to ACCEPTED");

                            // 3. Award points to photographer
                            try {
                                const { awardPoints, POINT_CONFIG } = await import('../services/pointsService');
                                await awardPoints({
                                    userId: booking.photographer_id,
                                    points: POINT_CONFIG.BOOKING_ACCEPTED,
                                    reason: `Booking confirmed via payment (ID: ${bookingId})`
                                });
                                console.log("[PaymentVerify] Points awarded to photographer");
                            } catch (pointsErr) {
                                console.error("[PaymentVerify] Error awarding points:", pointsErr);
                            }

                            // 4. Create Notification
                            await tx.notification.create({
                                data: {
                                    user_id: booking.photographer_id,
                                    title: 'Booking Paid & Confirmed',
                                    type: 'BOOKING',
                                    message: `Payment received for booking #${bookingId}. Status updated to ACCEPTED.`,
                                    is_read: false
                                }
                            });
                            console.log("[PaymentVerify] Booking status updated to ACCEPTED");
                        }
                    } else {
                        console.error("[PaymentVerify] Booking not found for ID inside transaction:", bookingId);
                        throw new Error(`Booking #${bookingId} not found`);
                    }
                    transactionSuccess = true;
                });

                // Fetch final booking data for socket
                const finalBooking = await prisma.booking.findUnique({
                    where: { booking_id: bookingId },
                    include: {
                        photographer: true,
                        client: true,
                        status: true,
                        package: true,
                        payment: {
                            include: {
                                status: true
                            }
                        }
                    }
                });

                if (finalBooking) {
                    console.log("[PaymentVerify] Emitting socket updates...");

                    // Get payment record for commission details
                    const paymentRecord = finalBooking.payment;
                    const platformFeePercentage = paymentRecord?.platform_fee_percentage ? Number(paymentRecord.platform_fee_percentage) : 0;
                    const commissionAmount = paymentRecord?.commission_amount ? Number(paymentRecord.commission_amount) : 0;
                    const photographerAmount = paymentRecord?.photographer_amount ? Number(paymentRecord.photographer_amount) : Number(finalBooking.amount);

                    const socketData = {
                        id: String(finalBooking.booking_id),
                        photographerId: finalBooking.photographer_id,
                        photographerName: finalBooking.photographer.full_name,
                        photographerAvatar: finalBooking.photographer.profile_image,
                        serviceTitle: finalBooking.package.name,
                        bookingDate: finalBooking.event_date.toISOString(),
                        bookingTime: new Date(finalBooking.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        status: finalBooking.status.status_name.toLowerCase(),
                        location: finalBooking.location,
                        amount: Number(finalBooking.amount),
                        packageName: finalBooking.package.name,
                        specialRequirements: finalBooking.notes,
                        createdAt: finalBooking.created_at.toISOString(),
                        paymentStatus: 'COMPLETED',
                        receiptData: {
                            transactionId: pidx,
                            date: new Date().toLocaleDateString(),
                            amount: Number(finalBooking.amount),
                            method: 'Khalti',
                            photographerName: finalBooking.photographer.full_name,
                            packageName: finalBooking.package.name,
                            bookingDates: [finalBooking.event_date.toLocaleDateString()],
                            customerName: finalBooking.client.full_name,
                            customerEmail: finalBooking.client.email,
                            platformFeePercentage,
                            commissionAmount,
                            photographerAmount
                        }
                    };

                    const io = (req as any).io;
                    if (io) {
                        io.to(finalBooking.client_id.toLowerCase()).emit('booking_updated', socketData);
                        io.to(finalBooking.photographer_id.toLowerCase()).emit('booking_updated', socketData);
                        console.log("[PaymentVerify] Socket events emitted to client and photographer");
                    }
                }
            } else {
                console.error("[PaymentVerify] Invalid Booking ID parsed from purchase_order_id:", data.purchase_order_id);
            }
        } else {
            console.warn("[PaymentVerify] Payment status is not 'Completed'. Current status:", data.status);
        }

        // Include payment details in the response for immediate use by frontend
        let paymentDetails = null;
        const lookupBookingId = bookingId || Number(providedBookingId);

        if (lookupBookingId && !isNaN(lookupBookingId)) {
            const payment = await prisma.payment.findUnique({
                where: { booking_id: lookupBookingId },
                include: {
                    booking: {
                        include: {
                            photographer: { select: { full_name: true } },
                            client: { select: { full_name: true, email: true } },
                            package: { select: { name: true } }
                        }
                    }
                }
            });
            if (payment) {
                paymentDetails = {
                    transactionId: pidx,
                    amount: Number(payment.amount),
                    platformFeePercentage: Number(payment.platform_fee_percentage || 0),
                    commissionAmount: Number(payment.commission_amount || 0),
                    photographerAmount: Number(payment.photographer_amount || payment.amount),
                    photographerName: (payment as any).booking.photographer.full_name,
                    packageName: (payment as any).booking.package.name,
                    customerName: (payment as any).booking.client.full_name,
                    customerEmail: payment.booking.client.email,
                    bookingDates: [payment.booking.event_date?.toLocaleDateString() || ''],
                    date: payment.paid_at?.toLocaleDateString() || new Date().toLocaleDateString(),
                    method: 'Khalti'
                };
            }
        }

        if ((normalizedStatus === 'COMPLETED' || normalizedStatus === 'SUCCESS') && (paymentDetails || (bookingId !== null && bookingId > 0))) {
            res.json({
                success: true,
                data: data,
                paymentDetails
            });
        } else {
            console.warn("[PaymentVerify] Returning failure: Status or Linkage issue", { normalizedStatus, hasPaymentDetails: !!paymentDetails });
            res.json({
                success: false,
                message: normalizedStatus === 'COMPLETED' || normalizedStatus === 'SUCCESS'
                    ? 'Payment success but failed to link to booking. Please contact support.'
                    : `Payment status is ${data.status}. Not yet completed.`,
                data: data
            });
        }

    } catch (error: any) {
        console.error('[PaymentVerify] Error details:', {
            message: error.message,
            khalti_error: error.response?.data,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment',
            error: error.response?.data || error.message
        });
    }
});


/**
 * GET /api/payment/details/:bookingId
 * Fetch payment details for a specific booking
 */
export const getPaymentDetails = catchAsync(async (req: Request, res: Response) => {
    const authUser = req.user;
    if (!authUser) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const bookingId = Number(req.params.bookingId);
    if (isNaN(bookingId)) {
        return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    // Verify the user is either the client or photographer of this booking
    const booking = await prisma.booking.findUnique({
        where: { booking_id: bookingId },
        include: {
            photographer: { select: { full_name: true, profile_image: true } },
            client: { select: { full_name: true, email: true } },
            package: { select: { name: true } },
            payment: {
                include: {
                    method: true,
                    status: true
                }
            }
        }
    });

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.client_id !== authUser.user_id && booking.photographer_id !== authUser.user_id) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this payment' });
    }

    if (!booking.payment) {
        return res.status(404).json({ success: false, message: 'No payment record found for this booking' });
    }

    const payment = booking.payment;

    return res.json({
        success: true,
        data: {
            transactionId: `BOOKING-${bookingId}`,
            amount: Number(payment.amount),
            platformFeePercentage: Number(payment.platform_fee_percentage || 0),
            commissionAmount: Number(payment.commission_amount || 0),
            photographerAmount: Number(payment.photographer_amount || payment.amount),
            photographerName: (booking as any).photographer.full_name,
            packageName: (booking as any).package.name,
            customerName: (booking as any).client.full_name,
            customerEmail: booking.client.email,
            bookingDates: [booking.event_date.toLocaleDateString()],
            date: payment.paid_at?.toLocaleDateString() || new Date().toLocaleDateString(),
            method: payment.method?.method_name || 'Khalti',
            paymentStatus: payment.status?.status_name || 'COMPLETED'
        }
    });
});
