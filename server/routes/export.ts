import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { stringify } from 'csv-stringify/sync';

const router = Router();
router.use(authenticate);
router.use(requireAdmin);

// Export Donors
router.get('/donors', async (_req, res) => {
  try {
    const donors = await prisma.donor.findMany({
      include: {
        donations: { where: { status: 'VALID' } },
        familyMembers: true
      }
    });

    const data = donors.map(donor => {
      const totalDonation = donor.donations.reduce((sum, d) => sum + d.amount, 0);
      let category = 'SUDAMA';
      if (totalDonation >= 1000000) category = 'PLATINUM';
      else if (totalDonation >= 500000) category = 'GOLD';
      else if (totalDonation >= 100000) category = 'SILVER';

      return {
        'Donor ID': donor.donorId,
        'Name': donor.fullName,
        'DOB': donor.dob ? donor.dob.toISOString().split('T')[0] : '',
        'Mobile': donor.mobile || '',
        'Email': donor.email || '',
        'Address': [donor.address, donor.city, donor.state, donor.pincode].filter(Boolean).join(', '),
        'Total Donation': totalDonation,
        'Category': category,
        'Family Count': donor.familyMembers.length,
        'SMS Permission': donor.smsPermission,
        'Status': donor.status
      };
    });

    const csv = stringify(data, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="donors_export.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export donors' });
  }
});

// Export Donations
router.get('/donations', async (_req, res) => {
  try {
    const donations = await prisma.donation.findMany({
      include: { donor: true }
    });

    const data = donations.map(d => ({
      'Donation ID': d.donationId,
      'Donor ID': d.donor.donorId,
      'Donor Name': d.donor.fullName,
      'Amount': d.amount,
      'Date': d.donationDate.toISOString().split('T')[0],
      'Payment Method': d.paymentMethod,
      'Transaction Ref': d.transactionReference || '',
      'Status': d.status
    }));

    const csv = stringify(data, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="donations_export.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export donations' });
  }
});

// Export Birthdays (Messages)
router.get('/birthdays', async (_req, res) => {
  try {
    const messages = await prisma.birthdayMessage.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const data = messages.map(m => ({
      'Type': m.personType,
      'Birthday Date': m.birthdayDate.toISOString().split('T')[0],
      'Birthday Year': m.birthdayYear,
      'Recipient': m.recipient,
      'Status': m.status,
      'Sent At': m.sentAt ? m.sentAt.toISOString() : '',
      'Failure Reason': m.failureReason || ''
    }));

    const csv = stringify(data, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="birthdays_export.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export birthdays' });
  }
});

export default router;
