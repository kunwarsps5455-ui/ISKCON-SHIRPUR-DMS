import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
// @ts-ignore - multer does not ship bundled types
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { logAudit } from '../middleware/audit.js';
import { generateNextDonorId } from './donors.js';

const router = Router();
router.use(authenticate);
router.use(requireAdmin);

const upload = multer({ storage: multer.memoryStorage() });

router.post('/donors', upload.single('file'), logAudit('IMPORT_DONORS', 'Donor'), async (req: AuthRequest & { file?: { buffer: Buffer } }, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const [index, record] of Object.entries(records)) {
      try {
        const row = record as any;
        const fullName = row['Name'] || row['fullName'] || row['Full Name'];
        if (!fullName) throw new Error('Missing name');

        const mobile = row['Mobile'] || row['mobile'] || null;
        
        let dob = null;
        const dobStr = row['DOB'] || row['dob'] || row['Date of Birth'];
        if (dobStr) {
          const parsedDate = new Date(dobStr);
          if (!isNaN(parsedDate.getTime())) dob = parsedDate;
        }

        const donorId = await generateNextDonorId();

        await prisma.donor.create({
          data: {
            donorId,
            fullName,
            dob,
            mobile,
            email: row['Email'] || row['email'] || null,
            address: row['Address'] || row['address'] || null,
            city: row['City'] || row['city'] || null,
            state: row['State'] || row['state'] || null,
            pincode: row['Pincode'] || row['pincode'] || null,
            smsPermission: row['SMS Permission'] || 'UNKNOWN',
            createdBy: req.user!.id
          }
        });
        successCount++;
      } catch (err: any) {
        errorCount++;
        errors.push(`Row ${Number(index) + 2}: ${err.message}`);
      }
    }

    res.locals.auditNewData = { imported: successCount, failed: errorCount };

    res.json({
      success: true,
      message: `Successfully imported ${successCount} donors. ${errorCount} failed.`,
      errors
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process import file' });
  }
});

export default router;
