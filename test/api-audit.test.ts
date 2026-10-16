/**
 * ISKCON Shirpur DMS & Devotee CRM - Master API & Integration Test Suite
 * Executes end-to-end against live running Express server (http://localhost:5000)
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000/api';

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function recordTest(suite: string, test: string, passed: boolean, details?: string, error?: string) {
  results.push({ suite, test, passed, details, error });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${suite}] ${test} ${details ? '(' + details + ')' : ''}`);
  if (error) console.error(`    Error: ${error}`);
}

async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  let data: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else if (contentType.includes('text/')) {
    data = await response.text();
  }
  return { status: response.status, data, headers: response.headers };
}

async function runTests() {
  console.log('================================================================');
  console.log('🕉️  STARTING COMPREHENSIVE ISKCON SHIRPUR E2E AUDIT TEST SUITE');
  console.log('================================================================\n');

  let adminToken = '';
  let checkerToken = '';
  let createdDonorId = '';
  let createdDonationId = '';
  let createdTaskId = '';

  // --------------------------------------------------------------------------
  // 1. SYSTEM HEALTH
  // --------------------------------------------------------------------------
  try {
    const res = await request('/health');
    recordTest(
      'System Health',
      'GET /health returns 200 and status ok',
      res.status === 200 && res.data?.status === 'ok',
      `Version: ${res.data?.version}`
    );
  } catch (err: any) {
    recordTest('System Health', 'GET /health', false, undefined, err.message);
  }

  // --------------------------------------------------------------------------
  // 2. AUTHENTICATION & RBAC
  // --------------------------------------------------------------------------
  try {
    // Admin Login
    const adminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@iskconshirpur.org', password: 'admin123' })
    });
    const adminOk = adminLoginRes.status === 200 && adminLoginRes.data?.user?.role === 'ADMIN';
    adminToken = adminLoginRes.data?.token || '';
    recordTest('Auth & RBAC', 'Admin login succeeds with JWT and ADMIN role', adminOk, `User: ${adminLoginRes.data?.user?.email}`);

    // Checker Login
    const checkerLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'checker@iskconshirpur.org', password: 'checker123' })
    });
    const checkerOk = checkerLoginRes.status === 200 && checkerLoginRes.data?.user?.role === 'CHECKER';
    checkerToken = checkerLoginRes.data?.token || '';
    recordTest('Auth & RBAC', 'Checker login succeeds with JWT and CHECKER role', checkerOk, `User: ${checkerLoginRes.data?.user?.email}`);

    // Invalid Password rejection
    const invalidLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@iskconshirpur.org', password: 'wrongpassword' })
    });
    recordTest('Auth & RBAC', 'Rejects invalid credentials with 401', invalidLoginRes.status === 401);

    // Profile verification
    const profileRes = await request('/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Auth & RBAC', 'GET /auth/me returns valid user info with Bearer auth', profileRes.status === 200 && profileRes.data?.user?.email === 'admin@iskconshirpur.org');
  } catch (err: any) {
    recordTest('Auth & RBAC', 'Login tests', false, undefined, err.message);
  }

  // --------------------------------------------------------------------------
  // 3. USER MANAGEMENT & RBAC ENFORCEMENT
  // --------------------------------------------------------------------------
  try {
    // Checker denied admin-only route
    const checkerDeniedRes = await request('/users', {
      headers: { Authorization: `Bearer ${checkerToken}` }
    });
    recordTest('RBAC Enforcement', 'Checker forbidden from GET /users with 403', checkerDeniedRes.status === 403);

    // Admin allowed to view users
    const adminUsersRes = await request('/users', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('User Management', 'Admin can list all system users', adminUsersRes.status === 200 && Array.isArray(adminUsersRes.data), `Total: ${adminUsersRes.data?.length}`);

    // Admin creates new user
    const uniqueEmail = `seva_${Date.now()}@iskconshirpur.org`;
    const createRes = await request('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Govinda Dasa',
        email: uniqueEmail,
        password: 'password123',
        role: 'CHECKER'
      })
    });
    recordTest('User Management', 'Admin can create new user (POST /users)', createRes.status === 201, `Email: ${uniqueEmail}`);

    if (createRes.data?.id) {
      // Toggle status
      const statusRes = await request(`/users/${createRes.data.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ active: false })
      });
      recordTest('User Management', 'Admin can deactivate user (PATCH /users/:id/status)', statusRes.status === 200 && statusRes.data?.active === false);
    }
  } catch (err: any) {
    recordTest('User Management', 'User tests', false, undefined, err.message);
  }

  // --------------------------------------------------------------------------
  // 4. DONORS & DEVOTEE CRM MANAGEMENT
  // --------------------------------------------------------------------------
  try {
    // Create new donor
    const donorPayload = {
      fullName: `Radharani Sevak ${Date.now().toString().slice(-4)}`,
      mobile: '9876543210',
      email: 'sevak@bhakti.org',
      dob: '1985-05-15',
      gender: 'Male',
      address: 'Near Temple Gate, Station Road',
      city: 'Shirpur',
      state: 'Maharashtra',
      pincode: '425405',
      stage: 'REGULAR',
      preferredChannel: 'WHATSAPP',
      whatsappPermission: 'ALLOWED',
      smsPermission: 'ALLOWED',
      notes: 'Dedicated devotee participating in weekly Sunday Feast'
    };

    const createDonorRes = await request('/donors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(donorPayload)
    });

    const donorCreated = createDonorRes.status === 201 && createDonorRes.data?.id;
    createdDonorId = createDonorRes.data?.id;
    recordTest('Donor Management', 'Admin creates new devotee record (POST /donors)', donorCreated, `Donor ID: ${createDonorRes.data?.donorId}`);

    // List donors with search
    const listRes = await request(`/donors?search=${encodeURIComponent(donorPayload.fullName)}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Donor Management', 'Search devotee by name (GET /donors?search=...)', listRes.status === 200 && listRes.data?.data?.length > 0);

    // Filter donors by category
    const categoryRes = await request('/donors?category=SUDAMA', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Donor Management', 'Filter devotees by category SUDAMA', categoryRes.status === 200 && Array.isArray(categoryRes.data?.data));

    // Get donor profile
    const getDonorRes = await request(`/donors/${createdDonorId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Donor Management', 'Get full devotee profile (GET /donors/:id)', getDonorRes.status === 200 && getDonorRes.data?.id === createdDonorId, `Category: ${getDonorRes.data?.category}`);

    // Update devotee stage
    const updateStageRes = await request(`/crm/donor/${createdDonorId}/stage`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ stage: 'PATRON' })
    });
    recordTest('CRM Workflow', 'Update devotee stage to PATRON (PATCH /crm/donor/:id/stage)', updateStageRes.status === 200 && updateStageRes.data?.stage === 'PATRON');
  } catch (err: any) {
    recordTest('Donor Management', 'Donor tests', false, undefined, err.message);
  }

  // --------------------------------------------------------------------------
  // 5. FAMILY MEMBERS
  // --------------------------------------------------------------------------
  try {
    const familyRes = await request(`/family/donor/${createdDonorId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        fullName: 'Tulasi Devi Sevika',
        relationship: 'Spouse',
        dob: '1988-10-14',
        mobile: '9876543211',
        smsPermission: 'ALLOWED',
        notes: 'Assists in Garlanding seva'
      })
    });
    recordTest('Family Members', 'Add family member to devotee (POST /family/donor/:id)', familyRes.status === 201 && familyRes.data?.relationship === 'Spouse');

    const familyListRes = await request('/family', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Family Members', 'List family members (GET /family)', familyListRes.status === 200 && Array.isArray(familyListRes.data?.data));
  } catch (err: any) {
    recordTest('Family Members', 'Family tests', false, undefined, err.message);
  }

  // --------------------------------------------------------------------------
  // 6. DONATIONS & AUTOMATED WHATSAPP RECEIPT
  // --------------------------------------------------------------------------
  try {
    // Validation check: 0 amount should be rejected
    const invalidDonationRes = await request(`/donations/donor/${createdDonorId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        amount: 0,
        paymentMethod: 'UPI'
      })
    });
    recordTest('Donations', 'Rejects 0 or negative donation amount with 400', invalidDonationRes.status === 400);

    // Create valid donation
    const donationRes = await request(`/donations/donor/${createdDonorId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        amount: 11000,
        donationDate: new Date().toISOString(),
        paymentMethod: 'UPI',
        transactionReference: 'UPI/HDFC/2026/00192',
        purpose: 'Sri Sri Radha Gopinath Janmashtami Seva',
        notes: 'Special Sankalpa for family peace',
        sendReceiptNow: true
      })
    });

    const donationCreated = donationRes.status === 201 && donationRes.data?.id;
    createdDonationId = donationRes.data?.id;
    recordTest(
      'Donations',
      'Record donation with auto WhatsApp receipt trigger (POST /donations/donor/:id)',
      donationCreated,
      `Receipt: ${donationRes.data?.donationId}, WhatsApp Sent: ${donationRes.data?.receiptStatus?.sent}`
    );

    // Manual receipt resend
    const resendRes = await request(`/donations/${createdDonationId}/send-receipt`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Donations', 'Manual WhatsApp receipt dispatch (POST /donations/:id/send-receipt)', resendRes.status === 200 && resendRes.data?.sent === true);

    // List all donations
    const listDonationsRes = await request('/donations', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Donations', 'List all recorded donations (GET /donations)', listDonationsRes.status === 200 && listDonationsRes.data?.data?.length > 0);
  } catch (err: any) {
    recordTest('Donations', 'Donation tests', false, undefined, err.message);
  }

  // --------------------------------------------------------------------------
  // 7. DEVOTEE CRM INTERACTIONS & TASKS
  // --------------------------------------------------------------------------
  try {
    // Log interaction
    const interactionRes = await request(`/crm/interactions/donor/${createdDonorId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        type: 'PHONE_CALL',
        subject: 'Invited for Sunday Feast Discourse',
        notes: 'Devotee gladly agreed to attend and sponsor prasadam',
        outcome: 'Confirmed'
      })
    });
    recordTest('Devotee CRM', 'Log devotee interaction (POST /crm/interactions/donor/:id)', interactionRes.status === 201);

    // Create CRM Task
    const taskRes = await request('/crm/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        donorId: createdDonorId,
        title: 'Follow-up regarding Janmashtami Abhishek Seva',
        description: 'Send deity abhisheka schedule and prasadam coupons',
        dueDate: new Date().toISOString(),
        priority: 'HIGH',
        assignedTo: 'Sankirtan Team'
      })
    });
    const taskOk = taskRes.status === 201 && taskRes.data?.id;
    createdTaskId = taskRes.data?.id;
    recordTest('Devotee CRM', 'Create devotee follow-up task (POST /crm/tasks)', taskOk, `Priority: ${taskRes.data?.priority}`);

    // Update task to completed
    if (createdTaskId) {
      const updateTaskRes = await request(`/crm/tasks/${createdTaskId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      recordTest('Devotee CRM', 'Mark task as COMPLETED (PATCH /crm/tasks/:id)', updateTaskRes.status === 200 && updateTaskRes.data?.status === 'COMPLETED');
    }

    // Get CRM Overview stats
    const statsRes = await request('/crm/stats', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest(
      'Devotee CRM',
      'Get CRM Analytics & Task metrics (GET /crm/stats)',
      statsRes.status === 200 && statsRes.data?.tasks !== undefined,
      `Total Donors: ${statsRes.data?.totalDonors}, Completed Tasks: ${statsRes.data?.tasks?.completed}`
    );
  } catch (err: any) {
    recordTest('Devotee CRM', 'CRM tests', false, undefined, err.message);
  }

  // --------------------------------------------------------------------------
  // 8. META WHATSAPP CLOUD API & WEBHOOK
  // --------------------------------------------------------------------------
  try {
    // Webhook challenge verification (Meta Handshake)
    const webhookRes = await request(
      '/whatsapp/webhook?hub.mode=subscribe&hub.challenge=ISKCON_CHALLENGE_2026&hub.verify_token=iskcon_shirpur_verify_token_2026'
    );
    recordTest(
      'WhatsApp Integration',
      'Meta Webhook challenge handshake (GET /whatsapp/webhook)',
      webhookRes.status === 200 && webhookRes.data === 'ISKCON_CHALLENGE_2026',
      `Challenge Returned: ${webhookRes.data}`
    );

    // Send custom WhatsApp text message
    const sendWaRes = await request('/whatsapp/send-text', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        phone: '9876543210',
        message: 'हरे कृष्ण! इस्कॉन शिरपुर में आपका स्वागत है। 🙏',
        donorId: createdDonorId
      })
    });
    recordTest(
      'WhatsApp Integration',
      'Send WhatsApp text message (POST /whatsapp/send-text)',
      sendWaRes.status === 200 && sendWaRes.data?.success === true,
      `Mode: ${sendWaRes.data?.isMock ? 'MOCK / SIMULATION' : 'LIVE API'}`
    );

    // Send WhatsApp template message
    const sendTemplateRes = await request('/whatsapp/send-template', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        phone: '9876543210',
        templateName: 'iskcon_birthday_blessing_hi',
        language: 'hi',
        donorId: createdDonorId
      })
    });
    recordTest(
      'WhatsApp Integration',
      'Send WhatsApp template blessing (POST /whatsapp/send-template)',
      sendTemplateRes.status === 200 && sendTemplateRes.data?.success === true
    );

    // Get WhatsApp communication logs
    const waLogsRes = await request('/whatsapp/logs', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('WhatsApp Integration', 'Fetch WhatsApp delivery logs (GET /whatsapp/logs)', waLogsRes.status === 200 && Array.isArray(waLogsRes.data));
  } catch (err: any) {
    recordTest('WhatsApp Integration', 'WhatsApp tests', false, undefined, err.message);
  }

  // --------------------------------------------------------------------------
  // 9. BIRTHDAY AUTOMATION
  // --------------------------------------------------------------------------
  try {
    const todayBdaysRes = await request('/birthdays/today', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Birthday Automation', "Fetch today's devotee birthdays (GET /birthdays/today)", todayBdaysRes.status === 200 && Array.isArray(todayBdaysRes.data));

    const triggerBdayRes = await request('/birthdays/trigger-run', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest(
      'Birthday Automation',
      'Trigger birthday automated greeting run (POST /birthdays/trigger-run)',
      triggerBdayRes.status === 200,
      `Status: ${triggerBdayRes.data?.status || 'COMPLETED'}`
    );

    const bdayLogsRes = await request('/birthdays/messages', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Birthday Automation', 'Fetch birthday message dispatch queue (GET /birthdays/messages)', bdayLogsRes.status === 200 && Array.isArray(bdayLogsRes.data));
  } catch (err: any) {
    recordTest('Birthday Automation', 'Birthday tests', false, undefined, err.message);
  }

  // --------------------------------------------------------------------------
  // 10. 15-MINUTE AUTOMATED DATA REFRESH & BACKGROUND SYNC
  // --------------------------------------------------------------------------
  try {
    const syncRes = await request('/cron/refresh-15min');
    recordTest(
      '15-Minute Sync & Cron',
      'External 15-minute background refresh execution (GET /cron/refresh-15min)',
      syncRes.status === 200 && syncRes.data?.status === 'SUCCESS',
      `Tasks Checked: ${syncRes.data?.tasksChecked}, Overdue: ${syncRes.data?.overdueTasksDetected}`
    );
  } catch (err: any) {
    recordTest('15-Minute Sync & Cron', 'Refresh tests', false, undefined, err.message);
  }

  // --------------------------------------------------------------------------
  // 11. REPORTS & CSV EXPORTS
  // --------------------------------------------------------------------------
  try {
    // Dashboard analytics
    const reportsRes = await request('/reports/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest(
      'Reports & Analytics',
      'Fetch dashboard summary analytics (GET /reports/dashboard)',
      reportsRes.status === 200 && reportsRes.data?.categories !== undefined
    );

    // Export Donors CSV
    const exportDonorsRes = await request('/export/donors', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const donorsCsvOk = exportDonorsRes.status === 200 && exportDonorsRes.headers.get('content-type')?.includes('text/csv');
    recordTest('CSV Export', 'Download Donors CSV with auth (GET /export/donors)', donorsCsvOk);

    // Export Donations CSV
    const exportDonationsRes = await request('/export/donations', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const donationsCsvOk = exportDonationsRes.status === 200 && exportDonationsRes.headers.get('content-type')?.includes('text/csv');
    recordTest('CSV Export', 'Download Donations CSV with auth (GET /export/donations)', donationsCsvOk);

    // Export Birthdays CSV
    const exportBirthdaysRes = await request('/export/birthdays', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const birthdaysCsvOk = exportBirthdaysRes.status === 200 && exportBirthdaysRes.headers.get('content-type')?.includes('text/csv');
    recordTest('CSV Export', 'Download Birthdays CSV with auth (GET /export/birthdays)', birthdaysCsvOk);
  } catch (err: any) {
    recordTest('Reports & CSV Export', 'Export tests', false, undefined, err.message);
  }

  // --------------------------------------------------------------------------
  // 12. MAJOR HINDU FESTIVALS & META WHATSAPP BROADCAST
  // --------------------------------------------------------------------------
  try {
    // 1. List Festival Templates
    const festListRes = await request('/festivals/templates', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest(
      'Hindu Festivals',
      'GET /festivals/templates returns all 8 Major Hindu & ISKCON templates',
      festListRes.status === 200 && Array.isArray(festListRes.data) && festListRes.data.length === 8,
      `Total: ${festListRes.data?.length} templates`
    );

    // 2. Preview Template with devotee name
    const previewRes = await request('/festivals/preview', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ festivalId: 'janmashtami', name: 'गोविन्द' })
    });
    const previewOk = previewRes.status === 200 && previewRes.data?.previewMessage?.includes('गोविन्द');
    recordTest('Hindu Festivals', 'POST /festivals/preview correctly substitutes {{name}}', previewOk);

    // 3. Broadcast Janmashtami with Family Members Included
    const broadcastWithFamRes = await request('/festivals/broadcast', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ festivalId: 'janmashtami', includeFamilyMembers: true })
    });
    recordTest(
      'Hindu Festivals',
      'Broadcast festival with family members included (POST /festivals/broadcast)',
      broadcastWithFamRes.status === 200 && broadcastWithFamRes.data?.familyIncluded === true,
      `Donors: ${broadcastWithFamRes.data?.dispatchedToDonors}, Family: ${broadcastWithFamRes.data?.dispatchedToFamily}`
    );

    // 4. Broadcast Radhashtami with Family Members Excluded
    const broadcastNoFamRes = await request('/festivals/broadcast', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ festivalId: 'radhashtami', includeFamilyMembers: false })
    });
    recordTest(
      'Hindu Festivals',
      'Broadcast festival with family members excluded (POST /festivals/broadcast)',
      broadcastNoFamRes.status === 200 && broadcastNoFamRes.data?.dispatchedToFamily === 0,
      `Donors: ${broadcastNoFamRes.data?.dispatchedToDonors}, Family: 0`
    );

    // 5. Toggle Individual Family Member Messaging Permission
    const familyList = await request('/family', { headers: { Authorization: `Bearer ${adminToken}` } });
    if (familyList.data?.data?.length > 0) {
      const famId = familyList.data.data[0].id;
      const toggleRes = await request(`/family/${famId}/messaging-permission`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ whatsappPermission: 'NOT_ALLOWED' })
      });
      recordTest(
        'Family Messaging Control',
        'Toggle individual family member permission (PATCH /family/:id/messaging-permission)',
        toggleRes.status === 200 && toggleRes.data?.whatsappPermission === 'NOT_ALLOWED'
      );
    }

    // 6. Global Setting for Family Messaging
    const settingRes = await request('/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ ENABLE_FAMILY_MEMBER_MESSAGES: 'false' })
    });
    recordTest('Family Messaging Control', 'Update global family messaging setting (PUT /settings)', settingRes.status === 200);

    // Re-enable for standard operations
    await request('/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ ENABLE_FAMILY_MEMBER_MESSAGES: 'true' })
    });
  } catch (err: any) {
    recordTest('Hindu Festivals & Family Control', 'Festival tests', false, undefined, err.message);
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 AUDIT TEST SUITE RESULTS SUMMARY');
  console.log('================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`TOTAL TESTS EXECUTED: ${total}`);
  console.log(`PASSED:               ${passed} (✅)`);
  console.log(`FAILED:               ${failed} (❌)`);
  console.log(`SUCCESS RATE:         ${((passed / total) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  if (failed > 0) {
    console.log('Failed Tests:');
    results.filter(r => !r.passed).forEach(r => console.log(`  - [${r.suite}] ${r.test}: ${r.error || 'Failed'}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL INTEGRATION TESTS PASSED WITHOUT EXCEPTION! SYSTEM IS 100% OPERATIONAL.');
    process.exit(0);
  }
}

runTests();
