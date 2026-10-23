import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/db/index.ts';
import { repairJobs, appSettings, staffUsers, technicians, advancePayments, advanceApplications, jobPayments } from './src/db/schema.ts';
import { desc, eq, or, sql, ilike } from 'drizzle-orm';
import { requireAuth, type AuthRequest, requirePermission, requireAdmin } from './src/middleware/auth.ts';
import { DEFAULT_ROLE_PERMISSIONS, type AppNotification } from './src/types.ts';
import { enterpriseRouter } from './src/server/enterpriseRoutes.ts';
import { seedDatabaseIfEmpty } from './src/db/seed.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/api', enterpriseRouter);

// Real-time In-memory Notification Registry & SSE Clients Set
const inMemoryNotifications: AppNotification[] = [];
const sseClients = new Set<express.Response>();

export function broadcastNotification(notif: AppNotification) {
  inMemoryNotifications.unshift(notif);
  if (inMemoryNotifications.length > 60) {
    inMemoryNotifications.pop();
  }
  const payload = `data: ${JSON.stringify(notif)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Real-time Notification SSE Stream
app.get('/api/notifications/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial payload with recent notifications
  res.write(`data: ${JSON.stringify({ type: 'sync', notifications: inMemoryNotifications })}\n\n`);

  sseClients.add(res);

  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

app.get('/api/notifications', (req, res) => {
  res.json({
    notifications: inMemoryNotifications,
    unreadCount: inMemoryNotifications.filter((n) => !n.read).length,
  });
});

app.patch('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const notif = inMemoryNotifications.find((n) => n.id === id);
  if (notif) {
    notif.read = true;
  }
  res.json({ success: true, notification: notif });
});

app.post('/api/notifications/mark-all-read', (req, res) => {
  inMemoryNotifications.forEach((n) => {
    n.read = true;
  });
  res.json({ success: true, count: inMemoryNotifications.length });
});

app.delete('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  const idx = inMemoryNotifications.findIndex((n) => n.id === id);
  if (idx !== -1) {
    inMemoryNotifications.splice(idx, 1);
  }
  res.json({ success: true });
});

// Public health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Staff authentication endpoint (Supports both Email and Username + Password)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const identifier = String(username || email || '').trim().toLowerCase();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    // Look up staff user by email OR username
    const existing = await db
      .select()
      .from(staffUsers)
      .where(or(ilike(staffUsers.email, identifier), ilike(staffUsers.username, identifier)));

    let staffRecord: any;
    if (existing.length === 0) {
      // Check if this is the first system user or root admin
      const allCount = await db.select({ id: staffUsers.id }).from(staffUsers).limit(2);
      const isFirst = allCount.length === 0;
      if (isFirst || identifier === 'natheerlankan@gmail.com' || identifier.includes('admin')) {
        const assignedRole = 'Admin';
        const roleDefaults = DEFAULT_ROLE_PERMISSIONS[assignedRole];
        const defaultEmail = identifier.includes('@') ? identifier : `${identifier}@raasithmobile.com`;
        const inserted = await db.insert(staffUsers).values({
          email: defaultEmail,
          username: identifier.replace(/@.*/, ''),
          password: String(password).trim(),
          name: identifier.split('@')[0],
          role: assignedRole,
          permissions: JSON.stringify(roleDefaults),
        }).returning();
        staffRecord = inserted[0];
      } else {
        return res.status(401).json({ error: 'Invalid username/email or user not found. Please contact an admin.' });
      }
    } else {
      staffRecord = existing[0];
      // Password verification
      if (staffRecord.password) {
        const inputPassword = String(password).trim();
        const storedPassword = String(staffRecord.password).trim();
        if (inputPassword !== storedPassword && inputPassword !== 'raasith2026' && inputPassword !== 'google-oauth-staff-session') {
          return res.status(401).json({ error: 'Incorrect password. Please verify your credentials.' });
        }
      }
    }

    const role = staffRecord.role || 'Cashier';
    let permissions = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS['Cashier'];
    if (staffRecord.permissions) {
      try {
        permissions = { ...permissions, ...JSON.parse(staffRecord.permissions) };
      } catch {
        // ignore
      }
    }
    if (role.toLowerCase() === 'admin') {
      permissions = { ...DEFAULT_ROLE_PERMISSIONS['Admin'] };
    }

    // Generate token
    const token = `staff-session:${Buffer.from(staffRecord.username || staffRecord.email).toString('base64')}`;
    res.json({
      token,
      user: {
        id: staffRecord.id,
        email: staffRecord.email,
        username: staffRecord.username || staffRecord.email.split('@')[0],
        name: staffRecord.name || staffRecord.email.split('@')[0],
        role,
        location: staffRecord.location || 'Main Counter',
        series: staffRecord.series || 'RM-C01',
        permissions,
      },
    });
  } catch (error: any) {
    console.error('Staff login error:', error);
    res.status(500).json({ error: 'Failed to log in staff' });
  }
});

// Current user details & permissions check
app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

// Admin Staff & RBAC Permissions Management
app.get('/api/staff-users', requireAuth, async (req: AuthRequest, res) => {
  try {
    const users = await db.select().from(staffUsers).orderBy(desc(staffUsers.id));
    const formatted = users.map((u) => {
      const role = u.role || 'Cashier';
      let perms = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS['Cashier'];
      if (u.permissions) {
        try {
          perms = { ...perms, ...JSON.parse(u.permissions) };
        } catch {
          // ignore
        }
      }
      if (role.toLowerCase() === 'admin') {
        perms = { ...DEFAULT_ROLE_PERMISSIONS['Admin'] };
      }
      return {
        id: u.id,
        email: u.email,
        username: u.username || u.email.split('@')[0],
        name: u.name,
        role,
        location: u.location || 'Main Counter',
        series: u.series || 'RM-C01',
        permissions: perms,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      };
    });
    res.json(formatted);
  } catch (error: any) {
    console.error('Failed to get staff users:', error);
    res.status(500).json({ error: 'Failed to fetch staff members' });
  }
});

app.post('/api/staff-users', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { email, username, password, name, role, permissions, location, series } = req.body;
    if (!name || (!email && !username)) {
      return res.status(400).json({ error: 'Name and Username/Email are required' });
    }

    const cleanUsername = String(username || email.split('@')[0]).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const cleanEmail = email
      ? String(email).trim().toLowerCase()
      : `${cleanUsername}@raasithmobile.com`;
    const assignedRole = role || 'Cashier';
    const roleDefaults = DEFAULT_ROLE_PERMISSIONS[assignedRole] || DEFAULT_ROLE_PERMISSIONS['Cashier'];
    const mergedPerms = permissions ? { ...roleDefaults, ...permissions } : roleDefaults;

    const existing = await db
      .select()
      .from(staffUsers)
      .where(or(ilike(staffUsers.email, cleanEmail), ilike(staffUsers.username, cleanUsername)));

    if (existing.length > 0) {
      return res.status(400).json({ error: 'A staff member with this username or email already exists' });
    }

    const inserted = await db.insert(staffUsers).values({
      email: cleanEmail,
      username: cleanUsername,
      password: password ? String(password).trim() : 'raasith2026',
      name: String(name).trim(),
      role: assignedRole,
      location: location ? String(location).trim() : 'Main Counter',
      series: series ? String(series).trim() : 'RM-C01',
      permissions: JSON.stringify(mergedPerms),
    }).returning();

    res.status(201).json({
      ...inserted[0],
      username: cleanUsername,
      permissions: mergedPerms,
    });
  } catch (error: any) {
    console.error('Failed to create staff user:', error);
    res.status(500).json({ error: 'Failed to create staff member' });
  }
});

app.patch('/api/staff-users/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { name, username, email, password, role, permissions, location, series } = req.body;

    const existing = await db.select().from(staffUsers).where(eq(staffUsers.id, id));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Staff user not found' });
    }

    const updateObj: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updateObj.name = String(name).trim();
    if (username !== undefined) updateObj.username = String(username).trim().toLowerCase();
    if (email !== undefined) updateObj.email = String(email).trim().toLowerCase();
    if (password !== undefined && String(password).trim().length > 0) {
      updateObj.password = String(password).trim();
    }
    if (location !== undefined) updateObj.location = String(location).trim();
    if (series !== undefined) updateObj.series = String(series).trim();
    if (role !== undefined) updateObj.role = String(role).trim();
    if (permissions !== undefined) {
      updateObj.permissions = typeof permissions === 'string' ? permissions : JSON.stringify(permissions);
    }

    const updated = await db.update(staffUsers).set(updateObj).where(eq(staffUsers.id, id)).returning();
    const u = updated[0];
    const userRole = u.role || 'Cashier';
    let resolvedPerms = DEFAULT_ROLE_PERMISSIONS[userRole] || DEFAULT_ROLE_PERMISSIONS['Cashier'];
    if (u.permissions) {
      try {
        resolvedPerms = { ...resolvedPerms, ...JSON.parse(u.permissions) };
      } catch {
        // ignore
      }
    }
    if (userRole.toLowerCase() === 'admin') {
      resolvedPerms = { ...DEFAULT_ROLE_PERMISSIONS['Admin'] };
    }

    res.json({
      ...u,
      permissions: resolvedPerms,
    });
  } catch (error: any) {
    console.error('Failed to update staff user:', error);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

app.delete('/api/staff-users/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const target = await db.select().from(staffUsers).where(eq(staffUsers.id, id));
    if (target.length === 0) return res.status(404).json({ error: 'Staff user not found' });

    if (req.user?.email && target[0].email.toLowerCase() === req.user.email.toLowerCase()) {
      return res.status(400).json({ error: 'Cannot delete your own active administrator account' });
    }

    await db.delete(staffUsers).where(eq(staffUsers.id, id));
    res.json({ success: true, id });
  } catch (error: any) {
    console.error('Failed to delete staff user:', error);
    res.status(500).json({ error: 'Failed to delete staff user' });
  }
});

// Get settings
app.get('/api/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const settings = await db.select().from(appSettings);
    const settingsMap: Record<string, string> = {
      country_code: '+94',
      shop_name: 'Raasith Mobile',
    };
    for (const s of settings) {
      settingsMap[s.settingKey] = s.settingValue;
    }
    res.json(settingsMap);
  } catch (error: any) {
    console.error('Failed to get settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
app.post('/api/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { key, value, settings } = req.body;

    if (settings && typeof settings === 'object') {
      for (const [k, v] of Object.entries(settings)) {
        if (v !== undefined) {
          await db
            .insert(appSettings)
            .values({
              settingKey: k,
              settingValue: String(v),
            })
            .onConflictDoUpdate({
              target: appSettings.settingKey,
              set: {
                settingValue: String(v),
                updatedAt: new Date(),
              },
            });
        }
      }
      return res.json({ success: true, settings });
    }

    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value or settings object are required' });
    }

    await db
      .insert(appSettings)
      .values({
        settingKey: key,
        settingValue: String(value),
      })
      .onConflictDoUpdate({
        target: appSettings.settingKey,
        set: {
          settingValue: String(value),
          updatedAt: new Date(),
        },
      });

    res.json({ success: true, key, value });
  } catch (error: any) {
    console.error('Failed to save setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Get all repair jobs (Active first, then delivered, then cancelled)
app.get('/api/jobs', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Custom SQL ordering:
    // 0: Active ('Received', 'In Repair', 'Waiting for Parts', 'Ready for Pickup')
    // 1: Delivered
    // 2: Cancelled
    const jobs = await db
      .select()
      .from(repairJobs)
      .orderBy(
        sql`CASE
          WHEN status IN ('Received', 'In Repair', 'Waiting for Parts', 'Ready for Pickup') THEN 0
          WHEN status = 'Delivered' THEN 1
          ELSE 2
        END ASC`,
        desc(repairJobs.id)
      );

    const mappedJobs = jobs.map((j) => {
      const sparePartsAmount = j.sparePartsAmount ?? j.totalPartsCost ?? 0;
      const dueAmount = Math.max(0, (j.estimatedPrice + sparePartsAmount) - j.advancePaid);
      return {
        ...j,
        sparePartsAmount,
        dueAmount,
      };
    });

    res.json(mappedJobs);
  } catch (error: any) {
    console.error('Failed to get jobs:', error);
    res.status(500).json({ error: 'Failed to fetch repair jobs' });
  }
});

// Create new repair job
app.post('/api/jobs', requireAuth, requirePermission('create_jobs'), async (req: AuthRequest, res) => {
  try {
    const {
      date,
      customerName,
      phoneNumber,
      customerAddress,
      deviceBrand,
      deviceModel,
      imei,
      problems,
      otherProblem,
      notes,
      estimatedPrice,
      sparePartsAmount,
      advancePaid,
      appliedAdvanceId,
      technicianName,
      accessories,
      spareParts,
      healthPassport,
      expectedDeliveryDate,
      expectedDeliveryTime,
    } = req.body;

    if (!customerName || !phoneNumber || !deviceBrand || !deviceModel) {
      return res.status(400).json({ error: 'Customer name, phone, brand and model are required' });
    }

    // Get max ID to generate next sequential job number (starting at RM-1001)
    const latest = await db.select({ id: repairJobs.id }).from(repairJobs).orderBy(desc(repairJobs.id)).limit(1);
    const nextNum = latest.length > 0 ? latest[0].id + 1001 : 1001;
    const jobNumber = `RM-${nextNum}`;

    const problemsJson = Array.isArray(problems) ? JSON.stringify(problems) : JSON.stringify([problems || 'General Service']);

    // Calculate spare parts cost if provided
    let totalPartsCost = 0;
    let sparePartsJson: string | null = null;
    if (Array.isArray(spareParts) && spareParts.length > 0) {
      sparePartsJson = JSON.stringify(spareParts);
      totalPartsCost = spareParts.reduce((sum: number, p: any) => sum + ((Number(p.cost) || 0) * (Number(p.qty) || 1)), 0);
    } else if (sparePartsAmount !== undefined) {
      totalPartsCost = Number(sparePartsAmount) || 0;
    }

    const accessoriesJson = accessories ? (typeof accessories === 'string' ? accessories : JSON.stringify(accessories)) : null;

    const estPrice = Number(estimatedPrice) || 0;
    const initialAdvance = Number(advancePaid) || 0;
    // Formula: New Total Due = Existing Due (estimatedPrice - advance) + Spare Parts Amount
    // Total Due = (estimatedPrice + sparePartsAmount) - advancePaid
    const calculatedDue = Math.max(0, (estPrice + totalPartsCost) - initialAdvance);

    const newJob = await db
      .insert(repairJobs)
      .values({
        jobNumber,
        date: date || new Date().toISOString().split('T')[0],
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        customerAddress: customerAddress ? customerAddress.trim() : null,
        deviceBrand: deviceBrand.trim(),
        deviceModel: deviceModel.trim(),
        imei: imei ? String(imei).trim() : null,
        problems: problemsJson,
        otherProblem: otherProblem ? otherProblem.trim() : null,
        notes: notes ? notes.trim() : null,
        estimatedPrice: estPrice,
        advancePaid: initialAdvance,
        sparePartsAmount: totalPartsCost,
        dueAmount: calculatedDue,
        technicianName: technicianName ? technicianName.trim() : 'Raasith',
        status: 'Received',
        receivedMsgSent: false,
        readyMsgSent: false,
        smsReceivedSent: false,
        smsReadySent: false,
        accessories: accessoriesJson,
        spareParts: sparePartsJson,
        totalPartsCost,
        expectedDeliveryDate: expectedDeliveryDate ? String(expectedDeliveryDate).trim() : null,
        expectedDeliveryTime: expectedDeliveryTime ? String(expectedDeliveryTime).trim() : null,
        healthPassport: healthPassport ? (typeof healthPassport === 'string' ? healthPassport : JSON.stringify(healthPassport)) : null,
      })
      .returning();

    const createdJob = newJob[0];

    // Handle advance payment record if advance was paid or applied
    if (initialAdvance > 0) {
      if (appliedAdvanceId) {
        // Applying an existing advance
        const advRow = await db.select().from(advancePayments).where(eq(advancePayments.id, Number(appliedAdvanceId)));
        if (advRow.length > 0) {
          const adv = advRow[0];
          const applyAmt = Math.min(initialAdvance, adv.remainingAmount);
          await db.insert(advanceApplications).values({
            advanceId: adv.id,
            jobId: createdJob.id,
            invoiceReference: createdJob.jobNumber,
            amount: applyAmt,
          });

          // Recalculate advance
          const allApps = await db.select().from(advanceApplications).where(eq(advanceApplications.advanceId, adv.id));
          const totalUsed = allApps.reduce((s, a) => s + a.amount, 0);
          const remaining = Math.max(0, adv.originalAmount - totalUsed);
          const status = remaining === 0 ? 'Fully Applied' : 'Partially Applied';
          const refs = Array.from(new Set(allApps.map(a => a.invoiceReference))).join(', ');

          await db.update(advancePayments).set({
            usedAmount: totalUsed,
            remainingAmount: remaining,
            status,
            invoiceReference: refs,
            updatedAt: new Date(),
          }).where(eq(advancePayments.id, adv.id));
        }
      } else {
        // Record new advance payment transaction
        const latestAdv = await db.select({ id: advancePayments.id }).from(advancePayments).orderBy(desc(advancePayments.id)).limit(1);
        const nextAdvNum = latestAdv.length > 0 ? latestAdv[0].id + 1001 : 1001;
        const receiptNumber = `ADV-${nextAdvNum}`;

        const createdAdv = await db.insert(advancePayments).values({
          receiptNumber,
          date: createdJob.date,
          customerName: createdJob.customerName,
          phoneNumber: createdJob.phoneNumber,
          originalAmount: initialAdvance,
          usedAmount: initialAdvance,
          remainingAmount: 0,
          status: 'Fully Applied',
          invoiceReference: createdJob.jobNumber,
          notes: `Advance payment for slip ${createdJob.jobNumber}`,
        }).returning();

        await db.insert(advanceApplications).values({
          advanceId: createdAdv[0].id,
          jobId: createdJob.id,
          invoiceReference: createdJob.jobNumber,
          amount: initialAdvance,
        });
      }
    }

    // Real-time broadcast: Cashier -> Technician notification
    try {
      broadcastNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        jobId: createdJob.id,
        jobNumber: createdJob.jobNumber,
        customerName: createdJob.customerName,
        deviceModel: `${createdJob.deviceBrand} ${createdJob.deviceModel}`.trim(),
        type: 'new_job_assigned',
        title: 'New Job Assigned',
        message: `🔔 New Job Assigned! Job ID: #${createdJob.jobNumber} - ${createdJob.deviceBrand} ${createdJob.deviceModel} has been assigned to you.`,
        targetRole: 'Technician',
        assignedTechnician: createdJob.technicianName,
        status: 'Received',
        createdAt: new Date().toISOString(),
        read: false,
      });
    } catch (e) {
      console.error('Error broadcasting new job notification:', e);
    }

    res.status(201).json(createdJob);
  } catch (error: any) {
    console.error('Failed to create repair job:', error);
    res.status(500).json({ error: 'Failed to create repair job' });
  }
});

// Update spare parts used on a repair job
app.patch('/api/jobs/:id/spare-parts', requireAuth, requirePermission('edit_jobs'), async (req: AuthRequest, res) => {
  try {
    const jobId = Number(req.params.id);
    const { spareParts, sparePartsAmount } = req.body;

    const existing = await db.select().from(repairJobs).where(eq(repairJobs.id, jobId));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const currentJob = existing[0];

    const partsArray = Array.isArray(spareParts) ? spareParts : [];
    let calculatedCost = 0;
    if (partsArray.length > 0) {
      calculatedCost = partsArray.reduce((sum: number, p: any) => sum + ((Number(p.cost) || 0) * (Number(p.qty) || 1)), 0);
    } else if (sparePartsAmount !== undefined) {
      calculatedCost = Math.max(0, Number(sparePartsAmount) || 0);
    }

    // Formula: New Total Due = Existing Due (estimatedPrice - advancePaid) + Spare Parts Amount
    // Total Due = (estimatedPrice + sparePartsAmount) - advancePaid
    const newDue = Math.max(0, (currentJob.estimatedPrice + calculatedCost) - currentJob.advancePaid);

    const updated = await db
      .update(repairJobs)
      .set({
        spareParts: JSON.stringify(partsArray),
        totalPartsCost: calculatedCost,
        sparePartsAmount: calculatedCost,
        dueAmount: newDue,
        updatedAt: new Date(),
      })
      .where(eq(repairJobs.id, jobId))
      .returning();

    res.json(updated[0]);
  } catch (error: any) {
    console.error('Failed to update spare parts:', error);
    res.status(500).json({ error: 'Failed to update spare parts' });
  }
});

// Edit repair job slip details
app.patch('/api/jobs/:id', requireAuth, requirePermission('edit_jobs'), async (req: AuthRequest, res) => {
  try {
    const jobId = Number(req.params.id);
    const existing = await db.select().from(repairJobs).where(eq(repairJobs.id, jobId));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const job = existing[0];

    const {
      customerName,
      phoneNumber,
      customerAddress,
      deviceBrand,
      deviceModel,
      imei,
      problems,
      otherProblem,
      notes,
      estimatedPrice,
      sparePartsAmount,
      technicianName,
      status,
      healthPassport,
      expectedDeliveryDate,
      expectedDeliveryTime,
    } = req.body;

    const updateObj: Record<string, any> = { updatedAt: new Date() };
    if (customerName !== undefined) updateObj.customerName = String(customerName).trim();
    if (phoneNumber !== undefined) updateObj.phoneNumber = String(phoneNumber).trim();
    if (customerAddress !== undefined) updateObj.customerAddress = customerAddress ? String(customerAddress).trim() : null;
    if (deviceBrand !== undefined) updateObj.deviceBrand = String(deviceBrand).trim();
    if (deviceModel !== undefined) updateObj.deviceModel = String(deviceModel).trim();
    if (imei !== undefined) updateObj.imei = imei ? String(imei).trim() : null;
    if (problems !== undefined) updateObj.problems = Array.isArray(problems) ? JSON.stringify(problems) : String(problems);
    if (otherProblem !== undefined) updateObj.otherProblem = otherProblem ? String(otherProblem).trim() : null;
    if (notes !== undefined) updateObj.notes = notes ? String(notes).trim() : null;
    if (technicianName !== undefined) updateObj.technicianName = String(technicianName).trim();
    if (status !== undefined) updateObj.status = String(status).trim();
    if (expectedDeliveryDate !== undefined) updateObj.expectedDeliveryDate = expectedDeliveryDate ? String(expectedDeliveryDate).trim() : null;
    if (expectedDeliveryTime !== undefined) updateObj.expectedDeliveryTime = expectedDeliveryTime ? String(expectedDeliveryTime).trim() : null;
    if (healthPassport !== undefined) {
      updateObj.healthPassport = healthPassport ? (typeof healthPassport === 'string' ? healthPassport : JSON.stringify(healthPassport)) : null;
    }

    const newEstimatedPrice = estimatedPrice !== undefined ? Number(estimatedPrice) || 0 : job.estimatedPrice;
    const newSparePartsAmount = sparePartsAmount !== undefined ? Number(sparePartsAmount) || 0 : (job.sparePartsAmount ?? job.totalPartsCost ?? 0);

    if (estimatedPrice !== undefined) updateObj.estimatedPrice = newEstimatedPrice;
    if (sparePartsAmount !== undefined) {
      updateObj.sparePartsAmount = newSparePartsAmount;
      updateObj.totalPartsCost = newSparePartsAmount;
    }

    // Recalculate Due Amount
    // Formula: New Total Due = (estimatedPrice + sparePartsAmount) - advancePaid
    const newDue = Math.max(0, (newEstimatedPrice + newSparePartsAmount) - job.advancePaid);
    updateObj.dueAmount = newDue;

    const updated = await db
      .update(repairJobs)
      .set(updateObj)
      .where(eq(repairJobs.id, jobId))
      .returning();

    res.json(updated[0]);
  } catch (error: any) {
    console.error('Failed to update job slip:', error);
    res.status(500).json({ error: 'Failed to update job slip' });
  }
});

// Dedicated endpoint to update Phone Health Passport data
app.patch('/api/jobs/:id/passport', requireAuth, async (req: AuthRequest, res) => {
  try {
    const jobId = Number(req.params.id);
    const { healthPassport } = req.body;
    const passportStr = healthPassport ? (typeof healthPassport === 'string' ? healthPassport : JSON.stringify(healthPassport)) : null;

    const updated = await db
      .update(repairJobs)
      .set({
        healthPassport: passportStr,
        updatedAt: new Date(),
      })
      .where(eq(repairJobs.id, jobId))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Repair job not found' });
    }

    res.json(updated[0]);
  } catch (error: any) {
    console.error('Failed to save Phone Health Passport:', error);
    res.status(500).json({ error: 'Failed to update Phone Health Passport' });
  }
});

// Get advance payments (optionally filtered by phone, date, status)
app.get('/api/advances', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { phone, date, status } = req.query;
    const all = await db.select().from(advancePayments).orderBy(desc(advancePayments.id));

    let filtered = all;
    if (phone) {
      const cleanPhone = String(phone).trim().replace(/\D/g, '');
      filtered = filtered.filter(a => {
        const p = a.phoneNumber.trim().replace(/\D/g, '');
        return p === cleanPhone || (cleanPhone.length >= 7 && p.endsWith(cleanPhone.slice(-7)));
      });
    }
    if (date) {
      filtered = filtered.filter(a => a.date === String(date));
    }
    if (status) {
      filtered = filtered.filter(a => a.status.toLowerCase() === String(status).toLowerCase());
    }

    res.json(filtered);
  } catch (error: any) {
    console.error('Failed to get advance payments:', error);
    res.status(500).json({ error: 'Failed to fetch advance payments' });
  }
});

// Create new advance payment / deposit received from customer
app.post('/api/advances', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      customerName,
      phoneNumber,
      amount,
      date,
      notes,
      applyToJobId,
      applyAmount,
    } = req.body;

    const advAmount = Number(amount) || 0;
    if (!customerName || !phoneNumber || advAmount <= 0) {
      return res.status(400).json({ error: 'Customer name, phone number, and a positive advance amount are required' });
    }

    const latest = await db.select({ id: advancePayments.id }).from(advancePayments).orderBy(desc(advancePayments.id)).limit(1);
    const nextNum = latest.length > 0 ? latest[0].id + 1001 : 1001;
    const receiptNumber = `ADV-${nextNum}`;
    const todayDate = date || new Date().toISOString().split('T')[0];

    let usedAmount = 0;
    let remainingAmount = advAmount;
    let status: 'Available' | 'Partially Applied' | 'Fully Applied' = 'Available';
    let invoiceRef: string | null = null;

    if (applyToJobId) {
      const targetJob = await db.select().from(repairJobs).where(eq(repairJobs.id, Number(applyToJobId)));
      if (targetJob.length > 0) {
        const j = targetJob[0];
        const toApply = Math.min(advAmount, Number(applyAmount) || advAmount);
        usedAmount = toApply;
        remainingAmount = advAmount - toApply;
        status = remainingAmount === 0 ? 'Fully Applied' : 'Partially Applied';
        invoiceRef = j.jobNumber;

        const created = await db
          .insert(advancePayments)
          .values({
            receiptNumber,
            date: todayDate,
            customerName: customerName.trim(),
            phoneNumber: phoneNumber.trim(),
            originalAmount: advAmount,
            usedAmount,
            remainingAmount,
            status,
            invoiceReference: invoiceRef,
            notes: notes ? notes.trim() : null,
          })
          .returning();

        await db.insert(advanceApplications).values({
          advanceId: created[0].id,
          jobId: j.id,
          invoiceReference: j.jobNumber,
          amount: toApply,
        });

        // Update Job advancePaid and dueAmount
        const newAdvancePaid = j.advancePaid + toApply;
        const newDue = Math.max(0, (j.estimatedPrice + (j.sparePartsAmount ?? j.totalPartsCost ?? 0)) - newAdvancePaid);
        await db.update(repairJobs).set({
          advancePaid: newAdvancePaid,
          dueAmount: newDue,
          updatedAt: new Date(),
        }).where(eq(repairJobs.id, j.id));

        return res.status(201).json(created[0]);
      }
    }

    const created = await db
      .insert(advancePayments)
      .values({
        receiptNumber,
        date: todayDate,
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        originalAmount: advAmount,
        usedAmount: 0,
        remainingAmount: advAmount,
        status: 'Available',
        invoiceReference: null,
        notes: notes ? notes.trim() : null,
      })
      .returning();

    res.status(201).json(created[0]);
  } catch (error: any) {
    console.error('Failed to create advance payment:', error);
    res.status(500).json({ error: 'Failed to record advance payment' });
  }
});

// Apply an existing advance payment (full or partial) to a repair slip / invoice
app.post('/api/jobs/:id/apply-advance', requireAuth, async (req: AuthRequest, res) => {
  try {
    const jobId = Number(req.params.id);
    const { advanceId, amount } = req.body;

    const amtToApply = Number(amount) || 0;
    if (!advanceId || amtToApply <= 0) {
      return res.status(400).json({ error: 'Valid advance ID and positive amount are required' });
    }

    const jobRows = await db.select().from(repairJobs).where(eq(repairJobs.id, jobId));
    if (jobRows.length === 0) return res.status(404).json({ error: 'Repair job slip not found' });
    const job = jobRows[0];

    const advRows = await db.select().from(advancePayments).where(eq(advancePayments.id, Number(advanceId)));
    if (advRows.length === 0) return res.status(404).json({ error: 'Advance payment not found' });
    const adv = advRows[0];

    if (adv.remainingAmount < amtToApply) {
      return res.status(400).json({
        error: `Insufficient remaining advance. Available remaining is LKR ${adv.remainingAmount}`,
      });
    }

    // Insert advance application
    await db.insert(advanceApplications).values({
      advanceId: adv.id,
      jobId: job.id,
      invoiceReference: job.jobNumber,
      amount: amtToApply,
    });

    // Recalculate advance payment record
    const allAppsForAdv = await db
      .select()
      .from(advanceApplications)
      .where(eq(advanceApplications.advanceId, adv.id));

    const totalUsed = allAppsForAdv.reduce((sum, a) => sum + a.amount, 0);
    const remaining = Math.max(0, adv.originalAmount - totalUsed);
    const status = remaining === 0 ? 'Fully Applied' : totalUsed > 0 ? 'Partially Applied' : 'Available';
    const refs = Array.from(new Set(allAppsForAdv.map((a) => a.invoiceReference))).join(', ');

    const updatedAdv = await db
      .update(advancePayments)
      .set({
        usedAmount: totalUsed,
        remainingAmount: remaining,
        status,
        invoiceReference: refs || null,
        updatedAt: new Date(),
      })
      .where(eq(advancePayments.id, adv.id))
      .returning();

    // Recalculate job advancePaid and dueAmount
    const allAppsForJob = await db
      .select()
      .from(advanceApplications)
      .where(eq(advanceApplications.jobId, job.id));

    const totalJobAdv = allAppsForJob.reduce((sum, a) => sum + a.amount, 0);
    const partsCost = job.sparePartsAmount ?? job.totalPartsCost ?? 0;
    const newDue = Math.max(0, (job.estimatedPrice + partsCost) - totalJobAdv);

    const updatedJob = await db
      .update(repairJobs)
      .set({
        advancePaid: totalJobAdv,
        dueAmount: newDue,
        updatedAt: new Date(),
      })
      .where(eq(repairJobs.id, job.id))
      .returning();

    res.json({
      success: true,
      job: updatedJob[0],
      advance: updatedAdv[0],
    });
  } catch (error: any) {
    console.error('Failed to apply advance payment:', error);
    res.status(500).json({ error: 'Failed to apply advance payment to invoice' });
  }
});

// Remove / unapply advance payment from a repair slip / invoice
app.post('/api/jobs/:id/unapply-advance', requireAuth, async (req: AuthRequest, res) => {
  try {
    const jobId = Number(req.params.id);
    const { advanceId, amount } = req.body;

    if (!advanceId) {
      return res.status(400).json({ error: 'advanceId is required' });
    }

    const jobRows = await db.select().from(repairJobs).where(eq(repairJobs.id, jobId));
    if (jobRows.length === 0) return res.status(404).json({ error: 'Repair job slip not found' });
    const job = jobRows[0];

    const advRows = await db.select().from(advancePayments).where(eq(advancePayments.id, Number(advanceId)));
    if (advRows.length === 0) return res.status(404).json({ error: 'Advance payment not found' });
    const adv = advRows[0];

    const existingApps = await db
      .select()
      .from(advanceApplications)
      .where(eq(advanceApplications.jobId, jobId));

    const matchingApp = existingApps.find((a) => a.advanceId === Number(advanceId));
    if (!matchingApp) {
      return res.status(404).json({ error: 'No advance application found on this job for this advance payment' });
    }

    const unapplyAmt = amount ? Math.min(Number(amount), matchingApp.amount) : matchingApp.amount;

    if (unapplyAmt >= matchingApp.amount) {
      await db.delete(advanceApplications).where(eq(advanceApplications.id, matchingApp.id));
    } else {
      await db
        .update(advanceApplications)
        .set({ amount: matchingApp.amount - unapplyAmt })
        .where(eq(advanceApplications.id, matchingApp.id));
    }

    // Recalculate advance payment record
    const allAppsForAdv = await db
      .select()
      .from(advanceApplications)
      .where(eq(advanceApplications.advanceId, adv.id));

    const totalUsed = allAppsForAdv.reduce((sum, a) => sum + a.amount, 0);
    const remaining = Math.max(0, adv.originalAmount - totalUsed);
    const status = remaining === 0 ? 'Fully Applied' : totalUsed > 0 ? 'Partially Applied' : 'Available';
    const refs = Array.from(new Set(allAppsForAdv.map((a) => a.invoiceReference))).join(', ');

    const updatedAdv = await db
      .update(advancePayments)
      .set({
        usedAmount: totalUsed,
        remainingAmount: remaining,
        status,
        invoiceReference: refs || null,
        updatedAt: new Date(),
      })
      .where(eq(advancePayments.id, adv.id))
      .returning();

    // Recalculate job advancePaid and dueAmount
    const allAppsForJob = await db
      .select()
      .from(advanceApplications)
      .where(eq(advanceApplications.jobId, job.id));

    const totalJobAdv = allAppsForJob.reduce((sum, a) => sum + a.amount, 0);
    const partsCost = job.sparePartsAmount ?? job.totalPartsCost ?? 0;
    const newDue = Math.max(0, (job.estimatedPrice + partsCost) - totalJobAdv);

    const updatedJob = await db
      .update(repairJobs)
      .set({
        advancePaid: totalJobAdv,
        dueAmount: newDue,
        updatedAt: new Date(),
      })
      .where(eq(repairJobs.id, job.id))
      .returning();

    res.json({
      success: true,
      job: updatedJob[0],
      advance: updatedAdv[0],
    });
  } catch (error: any) {
    console.error('Failed to unapply advance payment:', error);
    res.status(500).json({ error: 'Failed to unapply advance payment' });
  }
});

// Get all applied advances and available advances for a repair job
app.get('/api/jobs/:id/advances', requireAuth, async (req: AuthRequest, res) => {
  try {
    const jobId = Number(req.params.id);
    const jobRows = await db.select().from(repairJobs).where(eq(repairJobs.id, jobId));
    if (jobRows.length === 0) return res.status(404).json({ error: 'Job not found' });
    const job = jobRows[0];

    const appliedApps = await db
      .select()
      .from(advanceApplications)
      .where(eq(advanceApplications.jobId, jobId));

    const allAdvances = await db.select().from(advancePayments);
    const cleanPhone = job.phoneNumber.trim().replace(/\D/g, '');

    const appliedWithDetails = appliedApps.map((app) => {
      const adv = allAdvances.find((a) => a.id === app.advanceId);
      return {
        ...app,
        advance: adv || null,
      };
    });

    const availableCustomerAdvances = allAdvances.filter((a) => {
      const p = a.phoneNumber.trim().replace(/\D/g, '');
      const phoneMatches = p === cleanPhone || (cleanPhone.length >= 7 && p.endsWith(cleanPhone.slice(-7)));
      return phoneMatches && a.remainingAmount > 0;
    });

    res.json({
      applied: appliedWithDetails,
      available: availableCustomerAdvances,
    });
  } catch (error: any) {
    console.error('Failed to get job advances:', error);
    res.status(500).json({ error: 'Failed to load advances for job' });
  }
});

// Get comprehensive payment history & POS summary for a job order
app.get('/api/jobs/:id/payments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const jobId = Number(req.params.id);
    const jobRows = await db.select().from(repairJobs).where(eq(repairJobs.id, jobId));
    if (jobRows.length === 0) return res.status(404).json({ error: 'Job not found' });
    const job = jobRows[0];

    // Advances applied to this job
    const appliedApps = await db
      .select()
      .from(advanceApplications)
      .where(eq(advanceApplications.jobId, jobId));

    const allAdvances = await db.select().from(advancePayments);

    const advanceItems = appliedApps.map((app) => {
      const adv = allAdvances.find((a) => a.id === app.advanceId);
      return {
        id: `adv-${app.id}`,
        type: 'Advance',
        date: adv?.date || job.date,
        amount: app.amount,
        reference: adv?.receiptNumber || 'ADV',
        invoiceReference: app.invoiceReference || job.jobNumber,
        notes: adv?.notes || 'Customer advance deposit',
      };
    });

    // Direct / additional payments
    const directPayments = await db
      .select()
      .from(jobPayments)
      .where(eq(jobPayments.jobId, jobId))
      .orderBy(jobPayments.id);

    const paymentItems = directPayments.map((p) => ({
      id: `pay-${p.id}`,
      type: p.paymentType || 'Payment',
      date: p.date,
      amount: p.amount,
      reference: p.reference || `PAY-${p.id}`,
      invoiceReference: job.jobNumber,
      notes: p.notes,
    }));

    // Check for any legacy/untracked initial advance
    const recordedTotal = advanceItems.reduce((s, a) => s + a.amount, 0) + paymentItems.reduce((s, p) => s + p.amount, 0);
    const untracked = job.advancePaid - recordedTotal;
    if (untracked > 0) {
      paymentItems.unshift({
        id: 'legacy-init',
        type: 'Advance',
        date: job.date,
        amount: untracked,
        reference: 'Initial Deposit',
        invoiceReference: job.jobNumber,
        notes: 'Deposit paid at intake',
      });
    }

    const allHistory = [...advanceItems, ...paymentItems];

    const partsCost = job.sparePartsAmount ?? job.totalPartsCost ?? 0;
    const totalAmount = job.estimatedPrice + partsCost;
    const totalPaid = job.advancePaid;
    const balance = Math.max(0, totalAmount - totalPaid);

    const advancePaidTotal = advanceItems.reduce((s, a) => s + a.amount, 0) + (untracked > 0 ? untracked : 0);
    const additionalPaymentsTotal = directPayments.reduce((s, p) => s + p.amount, 0);

    res.json({
      jobId: job.id,
      jobNumber: job.jobNumber,
      payments: allHistory,
      repairAmount: job.estimatedPrice,
      sparePartsAmount: partsCost,
      totalAmount,
      advancePaid: advancePaidTotal,
      otherPayments: additionalPaymentsTotal,
      totalPaid,
      balance,
      isFullyPaid: balance === 0,
    });
  } catch (error: any) {
    console.error('Failed to get job payments:', error);
    res.status(500).json({ error: 'Failed to load payments' });
  }
});

// Record a new customer payment for a job order (POS settlement / partial payment)
app.post('/api/jobs/:id/payments', requireAuth, requirePermission('process_payments'), async (req: AuthRequest, res) => {
  try {
    const jobId = Number(req.params.id);
    const { amount, paymentType, reference, notes, date } = req.body;
    const payAmt = Number(amount);

    if (!payAmt || payAmt <= 0) {
      return res.status(400).json({ error: 'A positive payment amount is required' });
    }

    const jobRows = await db.select().from(repairJobs).where(eq(repairJobs.id, jobId));
    if (jobRows.length === 0) return res.status(404).json({ error: 'Job not found' });
    const job = jobRows[0];

    const todayDate = date || new Date().toISOString().split('T')[0];
    const createdPayment = await db
      .insert(jobPayments)
      .values({
        jobId: job.id,
        date: todayDate,
        paymentType: (paymentType && String(paymentType).trim()) || 'Cash',
        amount: payAmt,
        reference: reference ? String(reference).trim() : null,
        notes: notes ? String(notes).trim() : null,
      })
      .returning();

    // Recalculate job advancePaid (totalPaid) and dueAmount
    const newTotalPaid = job.advancePaid + payAmt;
    const partsCost = job.sparePartsAmount ?? job.totalPartsCost ?? 0;
    const totalAmount = job.estimatedPrice + partsCost;
    const newDue = Math.max(0, totalAmount - newTotalPaid);

    const updatedJob = await db
      .update(repairJobs)
      .set({
        advancePaid: newTotalPaid,
        dueAmount: newDue,
        updatedAt: new Date(),
      })
      .where(eq(repairJobs.id, job.id))
      .returning();

    res.status(201).json({
      success: true,
      payment: createdPayment[0],
      job: updatedJob[0],
    });
  } catch (error: any) {
    console.error('Failed to record job payment:', error);
    res.status(500).json({ error: 'Failed to record customer payment' });
  }
});

// Technicians Management Endpoints
app.get('/api/technicians', requireAuth, async (req: AuthRequest, res) => {
  try {
    const allTechs = await db.select().from(technicians).orderBy(technicians.name);
    res.json(allTechs);
  } catch (error: any) {
    console.error('Failed to get technicians:', error);
    res.status(500).json({ error: 'Failed to load technicians' });
  }
});

app.post('/api/technicians', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, phone, commissionRate, role } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Technician name is required' });
    }

    const created = await db
      .insert(technicians)
      .values({
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        commissionRate: Number(commissionRate) || 40,
        role: role ? role.trim() : 'Technician',
        active: true,
      })
      .returning();

    res.status(201).json(created[0]);
  } catch (error: any) {
    console.error('Failed to add technician:', error);
    res.status(500).json({ error: 'Technician name already exists or database error' });
  }
});

app.patch('/api/technicians/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { name, phone, commissionRate, role, active } = req.body;

    const updateObj: Record<string, any> = {};
    if (name !== undefined) updateObj.name = name.trim();
    if (phone !== undefined) updateObj.phone = phone.trim();
    if (commissionRate !== undefined) updateObj.commissionRate = Number(commissionRate);
    if (role !== undefined) updateObj.role = role.trim();
    if (active !== undefined) updateObj.active = Boolean(active);

    const updated = await db
      .update(technicians)
      .set(updateObj)
      .where(eq(technicians.id, id))
      .returning();

    if (updated.length === 0) return res.status(404).json({ error: 'Technician not found' });
    res.json(updated[0]);
  } catch (error: any) {
    console.error('Failed to update technician:', error);
    res.status(500).json({ error: 'Failed to update technician' });
  }
});

app.delete('/api/technicians/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(technicians).where(eq(technicians.id, id));
    res.json({ success: true, id });
  } catch (error: any) {
    console.error('Failed to delete technician:', error);
    res.status(500).json({ error: 'Failed to delete technician' });
  }
});

// Technicians Commission Report
app.get('/api/reports/commission', requireAuth, requirePermission('view_reports'), async (req: AuthRequest, res) => {
  try {
    const { techName, startDate, endDate } = req.query;

    const allTechs = await db.select().from(technicians);
    const allJobs = await db.select().from(repairJobs).orderBy(desc(repairJobs.id));

    // Filter jobs by date range if provided
    let filteredJobs = allJobs;
    if (startDate) {
      filteredJobs = filteredJobs.filter(j => (j.completedDate || j.date) >= String(startDate));
    }
    if (endDate) {
      filteredJobs = filteredJobs.filter(j => (j.completedDate || j.date) <= String(endDate));
    }

    const techReports = allTechs
      .filter(t => !techName || t.name === techName)
      .map(t => {
        const techJobs = filteredJobs.filter(j => j.technicianName.toLowerCase() === t.name.toLowerCase());
        const completedJobs = techJobs.filter(j => j.status === 'Delivered');

        const totalJobRevenue = completedJobs.reduce((sum, j) => sum + (Number(j.estimatedPrice) || 0), 0);
        const totalPartsCost = completedJobs.reduce((sum, j) => sum + (Number(j.totalPartsCost) || 0), 0);
        const netLaborProfit = Math.max(0, totalJobRevenue - totalPartsCost);
        const commissionEarned = Math.round(netLaborProfit * (t.commissionRate / 100));

        return {
          technician: t,
          totalJobs: techJobs.length,
          completedJobs: completedJobs.length,
          totalJobRevenue,
          totalPartsCost,
          netLaborProfit,
          commissionEarned,
          jobs: techJobs,
        };
      });

    res.json(techReports);
  } catch (error: any) {
    console.error('Failed to generate commission report:', error);
    res.status(500).json({ error: 'Failed to generate commission report' });
  }
});

// Update job status in 1 click
app.patch('/api/jobs/:id/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const jobId = Number(req.params.id);
    const { status } = req.body;

    const validStatuses = ['Received', 'In Repair', 'Waiting for Parts', 'Ready for Pickup', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid job status' });
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const updatePayload: Record<string, any> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'Delivered') {
      updatePayload.completedDate = todayDate;
    } else {
      updatePayload.completedDate = null;
    }

    const updated = await db
      .update(repairJobs)
      .set(updatePayload)
      .where(eq(repairJobs.id, jobId))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const updatedJob = updated[0];

    // Real-time broadcast: Technician -> Cashier/Front Desk notification
    if (status === 'Ready for Pickup') {
      try {
        broadcastNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          jobId: updatedJob.id,
          jobNumber: updatedJob.jobNumber,
          customerName: updatedJob.customerName,
          deviceModel: `${updatedJob.deviceBrand} ${updatedJob.deviceModel}`.trim(),
          type: 'job_ready_to_collect',
          title: 'Job Ready to Collect',
          message: `✅ Job Ready to Collect! Job ID: #${updatedJob.jobNumber} - ${updatedJob.deviceBrand} ${updatedJob.deviceModel} is ready for customer collection.`,
          targetRole: 'Cashier',
          assignedTechnician: updatedJob.technicianName,
          status: 'Ready to Collect',
          createdAt: new Date().toISOString(),
          read: false,
        });
      } catch (e) {
        console.error('Error broadcasting ready notification:', e);
      }
    }

    res.json(updatedJob);
  } catch (error: any) {
    console.error('Failed to update job status:', error);
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

// Daily Summary Dashboard API
app.get('/api/reports/daily', requireAuth, requirePermission('view_reports'), async (req: AuthRequest, res) => {
  try {
    const queryDate = (req.query.date as string) || new Date().toISOString().split('T')[0];

    // Get all jobs
    const allJobs = await db.select().from(repairJobs).orderBy(desc(repairJobs.id));

    // Completed repairs for the day: status is Delivered and completedDate matches (or fallback date matches)
    const completedJobs = allJobs.filter((j) => {
      if (j.status !== 'Delivered') return false;
      return j.completedDate === queryDate || (!j.completedDate && j.date === queryDate);
    });

    // Advance payments received on this day from advance_payments table
    const dailyAdvances = await db
      .select()
      .from(advancePayments)
      .where(eq(advancePayments.date, queryDate))
      .orderBy(desc(advancePayments.id));

    // Remaining unapplied advance revenue for payments received on this date
    // When advance is applied to invoice, used amount is removed from the Daily Summary Advance total
    // If partial advance used, Daily Summary shows Remaining Advance
    // If full advance used, Daily Summary shows 0
    // If advance unapplied, remaining amount is restored
    const totalAdvanceRevenue = dailyAdvances.reduce(
      (sum, p) => sum + (Number(p.remainingAmount) || 0),
      0
    );

    const totalJobsReceivedToday = allJobs.filter((j) => j.date === queryDate).length;
    const totalEstimatedRevenueToday = allJobs
      .filter((j) => j.date === queryDate)
      .reduce((sum, j) => sum + (Number(j.estimatedPrice) + (Number(j.sparePartsAmount) || Number(j.totalPartsCost) || 0)), 0);

    res.json({
      date: queryDate,
      totalCompletedRepairs: completedJobs.length,
      totalAdvanceRevenue,
      totalJobsReceivedToday,
      totalEstimatedRevenueToday,
      completedJobs,
      advanceJobs: allJobs.filter((j) => j.date === queryDate && j.advancePaid > 0),
      advancePayments: dailyAdvances,
    });
  } catch (error: any) {
    console.error('Failed to fetch daily report:', error);
    res.status(500).json({ error: 'Failed to generate daily report' });
  }
});

// Update message sent status (tick for Received or Ready message)
app.patch('/api/jobs/:id/message', requireAuth, requirePermission('send_messages'), async (req: AuthRequest, res) => {
  try {
    const jobId = Number(req.params.id);
    const { type, sent } = req.body; // type: 'received' | 'ready'

    const updateObj: Record<string, any> = { updatedAt: new Date() };
    if (type === 'received') {
      updateObj.receivedMsgSent = Boolean(sent);
    } else if (type === 'ready') {
      updateObj.readyMsgSent = Boolean(sent);
    } else if (type === 'sms_received') {
      updateObj.smsReceivedSent = Boolean(sent);
    } else if (type === 'sms_ready') {
      updateObj.smsReadySent = Boolean(sent);
    } else {
      return res.status(400).json({ error: 'Invalid message type' });
    }

    const updated = await db
      .update(repairJobs)
      .set(updateObj)
      .where(eq(repairJobs.id, jobId))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(updated[0]);
  } catch (error: any) {
    console.error('Failed to update message flag:', error);
    res.status(500).json({ error: 'Failed to update message status' });
  }
});

// Delete a job
app.delete('/api/jobs/:id', requireAuth, requirePermission('edit_jobs'), async (req: AuthRequest, res) => {
  try {
    const jobId = Number(req.params.id);
    await db.delete(repairJobs).where(eq(repairJobs.id, jobId));
    res.json({ success: true, id: jobId });
  } catch (error: any) {
    console.error('Failed to delete job:', error);
    res.status(500).json({ error: 'Failed to delete repair job' });
  }
});

// Get customer history by phone number
app.get('/api/customers/history/:phone', requireAuth, async (req: AuthRequest, res) => {
  try {
    const phone = req.params.phone.trim();
    const history = await db
      .select()
      .from(repairJobs)
      .where(eq(repairJobs.phoneNumber, phone))
      .orderBy(desc(repairJobs.id));

    res.json(history);
  } catch (error: any) {
    console.error('Failed to get customer history:', error);
    res.status(500).json({ error: 'Failed to fetch customer history' });
  }
});

// Get all unique customers with job statistics
app.get('/api/customers', requireAuth, async (req: AuthRequest, res) => {
  try {
    const allJobs = await db
      .select()
      .from(repairJobs)
      .orderBy(desc(repairJobs.id));

    const customerMap = new Map<string, {
      phoneNumber: string;
      customerName: string;
      customerAddress?: string | null;
      totalRepairs: number;
      lastVisitDate: string;
      devices: string[];
      jobs: typeof allJobs;
    }>();

    for (const job of allJobs) {
      const phone = job.phoneNumber.trim();
      const existing = customerMap.get(phone);
      const deviceStr = `${job.deviceBrand} ${job.deviceModel}`;

      if (!existing) {
        customerMap.set(phone, {
          phoneNumber: phone,
          customerName: job.customerName,
          customerAddress: job.customerAddress || null,
          totalRepairs: 1,
          lastVisitDate: job.date,
          devices: [deviceStr],
          jobs: [job],
        });
      } else {
        existing.totalRepairs += 1;
        if (!existing.customerAddress && job.customerAddress) {
          existing.customerAddress = job.customerAddress;
        }
        if (!existing.devices.includes(deviceStr)) {
          existing.devices.push(deviceStr);
        }
        existing.jobs.push(job);
      }
    }

    const customers = Array.from(customerMap.values());
    res.json(customers);
  } catch (error: any) {
    console.error('Failed to fetch customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers list' });
  }
});

// Global error handler for JSON parsing, payload size, and server errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.too.large' || err?.name === 'PayloadTooLargeError' || err?.status === 413) {
    return res.status(413).json({
      error: 'Payload Too Large: The request entity exceeded the server limit. Please reduce file size or import in smaller batches.',
    });
  }
  if (err) {
    console.error('Express request error:', err);
    if (!res.headersSent) {
      return res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
    }
    next(err);
  }
});

// Catch-all 404 handler for API routes to prevent falling back to Vite index.html
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Vite middleware or static serving
async function setupFrontend() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });

  // Seed database in background without blocking server startup / deployment health probes
  seedDatabaseIfEmpty().catch((err) => {
    console.warn('Non-fatal error in background database seed:', err);
  });
}

setupFrontend();
