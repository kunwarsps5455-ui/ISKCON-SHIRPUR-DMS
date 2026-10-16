import http from 'http';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000/api';

interface TestResult {
  id: string;
  title: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];
let adminToken = '';

function record(id: string, title: string, passed: boolean, details: string) {
  results.push({ id, title, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} | [${id}] ${title} -> ${details}`);
}

async function request(
  endpoint: string,
  method = 'GET',
  body?: any,
  token?: string
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, data };
}

async function runSecondPassTests() {
  console.log('================================================================================');
  console.log('🔬 SECOND-PASS INDEPENDENT VERIFICATION & REGRESSION SUITE');
  console.log('================================================================================\n');

  // Authenticate as Admin
  const loginRes = await request('/auth/login', 'POST', {
    email: 'admin@iskconshirpur.org',
    password: 'admin123',
  });
  if (loginRes.status !== 200 || !loginRes.data.token) {
    console.error('FATAL: Could not login as admin:', loginRes);
    process.exit(1);
  }
  adminToken = loginRes.data.token;

  // Fetch a valid donor for tests
  const donorsRes = await request('/donors?take=50', 'GET', undefined, adminToken);
  const firstDonor = donorsRes.data.data[0];

  // ---------------------------------------------------------------------------
  // R1: Family member creation must respect whatsappPermission in request body
  // ---------------------------------------------------------------------------
  const famCreateRes = await request(
    `/family/donor/${firstDonor.id}`,
    'POST',
    {
      fullName: 'Test OptOut Spouse',
      relationship: 'Spouse',
      dob: '1992-06-15',
      mobile: '9811122233',
      whatsappPermission: 'NOT_ALLOWED',
    },
    adminToken
  );
  record(
    'R1',
    'POST /api/family/donor/:donorId respects whatsappPermission="NOT_ALLOWED" on creation',
    famCreateRes.status === 201 && famCreateRes.data?.whatsappPermission === 'NOT_ALLOWED',
    `status=${famCreateRes.status}, whatsappPermission=${famCreateRes.data?.whatsappPermission}`
  );

  // ---------------------------------------------------------------------------
  // R2: Donation creation input validation (missing/NaN amount & invalid paymentMethod)
  // ---------------------------------------------------------------------------
  const badDon1 = await request(
    `/donations/donor/${firstDonor.id}`,
    'POST',
    { paymentMethod: 'UPI', purpose: 'Test missing amount' },
    adminToken
  );
  const badDon2 = await request(
    `/donations/donor/${firstDonor.id}`,
    'POST',
    { amount: 'not-a-number', paymentMethod: 'UPI' },
    adminToken
  );
  const badDon3 = await request(
    `/donations/donor/${firstDonor.id}`,
    'POST',
    { amount: 501, paymentMethod: '' },
    adminToken
  );
  record(
    'R2',
    'POST /api/donations/donor/:donorId rejects missing/NaN amount or empty paymentMethod with 400 (not 500)',
    badDon1.status === 400 && badDon2.status === 400 && badDon3.status === 400,
    `missingAmount=${badDon1.status}, nanAmount=${badDon2.status}, emptyMethod=${badDon3.status}`
  );

  // ---------------------------------------------------------------------------
  // R3: Donor creation input validation (missing fullName returns 400 not 500)
  // ---------------------------------------------------------------------------
  const badDonor = await request(
    '/donors',
    'POST',
    { mobile: '9800001111' },
    adminToken
  );
  record(
    'R3',
    'POST /api/donors rejects missing fullName with 400 (not 500)',
    badDonor.status === 400,
    `status=${badDonor.status}`
  );

  // ---------------------------------------------------------------------------
  // R4: Family creation validation (non-existent donorId -> 404, missing fullName -> 400)
  // ---------------------------------------------------------------------------
  const badFamDonor = await request(
    '/family/donor/non-existent-donor-uuid',
    'POST',
    { fullName: 'Ghost Relative', relationship: 'Son' },
    adminToken
  );
  const badFamFields = await request(
    `/family/donor/${firstDonor.id}`,
    'POST',
    { fullName: '' },
    adminToken
  );
  record(
    'R4',
    'POST /api/family/donor/:donorId returns 404 for unknown donorId and 400 for missing fullName/relationship',
    badFamDonor.status === 404 && badFamFields.status === 400,
    `unknownDonor=${badFamDonor.status}, missingFields=${badFamFields.status}`
  );

  // ---------------------------------------------------------------------------
  // R5: Donor category filter with pagination (skip/take applied AFTER category filter)
  // ---------------------------------------------------------------------------
  const allPlatinum = await request('/donors?category=PLATINUM&take=100', 'GET', undefined, adminToken);
  const pagedPlatinum = await request('/donors?category=PLATINUM&skip=0&take=2', 'GET', undefined, adminToken);
  record(
    'R5',
    'GET /api/donors?category=PLATINUM&take=2 filters by category BEFORE pagination and returns accurate total',
    allPlatinum.data.total > 0 &&
      pagedPlatinum.data.data.length === Math.min(2, allPlatinum.data.total) &&
      pagedPlatinum.data.total === allPlatinum.data.total,
    `allPlatinumTotal=${allPlatinum.data.total}, pagedSliceLen=${pagedPlatinum.data.data.length}, pagedTotal=${pagedPlatinum.data.total}`
  );

  // ---------------------------------------------------------------------------
  // R6: Manual birthday trigger respects zero-duplicate safety
  // ---------------------------------------------------------------------------
  const todayIso = new Date().toISOString().split('T')[0];
  await request(
    '/donors',
    'POST',
    {
      fullName: 'Duplicate Guard Devotee',
      dob: todayIso,
      mobile: '9876500099',
      whatsappPermission: 'ALLOWED',
    },
    adminToken
  );
  await request('/birthdays/trigger-run', 'POST', undefined, adminToken);
  const secondTrigger = await request('/birthdays/trigger-run', 'POST', undefined, adminToken);
  record(
    'R6',
    'POST /api/birthdays/trigger-run respects zero-duplicate safety on repeated clicks in the same year',
    secondTrigger.status === 200 && secondTrigger.data?.sent === 0 && secondTrigger.data?.skipped >= 1,
    `secondTrigger.sent=${secondTrigger.data?.sent}, skipped=${secondTrigger.data?.skipped}`
  );

  // ---------------------------------------------------------------------------
  // R7: Global ENABLE_FAMILY_MEMBER_MESSAGES="false" enforced even if request passes includeFamilyMembers: true
  // ---------------------------------------------------------------------------
  await request('/settings', 'PUT', { ENABLE_FAMILY_MEMBER_MESSAGES: 'false' }, adminToken);
  const bcastDisabled = await request(
    '/festivals/broadcast',
    'POST',
    {
      festivalId: 'ram_navami',
      includeFamilyMembers: true,
      donorCategoryFilter: 'ALL',
    },
    adminToken
  );
  await request('/settings', 'PUT', { ENABLE_FAMILY_MEMBER_MESSAGES: 'true' }, adminToken);
  record(
    'R7',
    'POST /api/festivals/broadcast enforces global ENABLE_FAMILY_MEMBER_MESSAGES=false even when includeFamilyMembers=true is passed',
    bcastDisabled.status === 200 &&
      bcastDisabled.data?.familyIncluded === false &&
      bcastDisabled.data?.dispatchedToFamily === 0,
    `familyIncluded=${bcastDisabled.data?.familyIncluded}, dispatchedToFamily=${bcastDisabled.data?.dispatchedToFamily}`
  );

  // ---------------------------------------------------------------------------
  // R14: GET /api/reports/dashboard includes upcomingBirthdays array for Dashboard KPI
  // ---------------------------------------------------------------------------
  const dashRes = await request('/reports/dashboard', 'GET', undefined, adminToken);
  record(
    'R14',
    'GET /api/reports/dashboard returns upcomingBirthdays array with today birthdays',
    dashRes.status === 200 && Array.isArray(dashRes.data?.upcomingBirthdays) && dashRes.data.upcomingBirthdays.length >= 1,
    `upcomingBirthdays.length=${dashRes.data?.upcomingBirthdays?.length}`
  );

  // ---------------------------------------------------------------------------
  // R8: Authenticated POST /api/crm/refresh endpoint for manual UI sync
  // ---------------------------------------------------------------------------
  const crmRefreshRes = await request('/crm/refresh', 'POST', undefined, adminToken);
  record(
    'R8',
    'POST /api/crm/refresh allows authenticated users to sync CRM without needing CRON_SECRET',
    crmRefreshRes.status === 200 && crmRefreshRes.data?.status === 'SUCCESS',
    `status=${crmRefreshRes.status}, refreshStatus=${crmRefreshRes.data?.status}`
  );

  // ---------------------------------------------------------------------------
  // R9: AUTO_RECEIPT_ENABLED="false" suppresses automatic WhatsApp receipt on donation creation
  // ---------------------------------------------------------------------------
  await request('/settings', 'PUT', { AUTO_RECEIPT_ENABLED: 'false' }, adminToken);
  const donNoAutoReceipt = await request(
    `/donations/donor/${firstDonor.id}`,
    'POST',
    {
      amount: 1100,
      paymentMethod: 'UPI',
      purpose: 'Test Auto Receipt Disabled',
      sendReceiptNow: true,
    },
    adminToken
  );
  await request('/settings', 'PUT', { AUTO_RECEIPT_ENABLED: 'true' }, adminToken);
  record(
    'R9',
    'POST /api/donations/donor/:donorId respects AUTO_RECEIPT_ENABLED=false system setting',
    donNoAutoReceipt.status === 201 && donNoAutoReceipt.data?.receiptSent === false,
    `status=${donNoAutoReceipt.status}, receiptSent=${donNoAutoReceipt.data?.receiptSent}`
  );

  // ---------------------------------------------------------------------------
  // R10: AUTO_WHATSAPP_ENABLED="false" respected by birthday automation
  // ---------------------------------------------------------------------------
  const bdayDonor2 = await request(
    '/donors',
    'POST',
    {
      fullName: 'WA Disabled Bday Devotee',
      dob: todayIso,
      mobile: '9876500088',
      preferredChannel: 'WHATSAPP',
      whatsappPermission: 'ALLOWED',
    },
    adminToken
  );
  await request('/settings', 'PUT', { AUTO_WHATSAPP_ENABLED: 'false' }, adminToken);
  await request('/birthdays/trigger-run', 'POST', undefined, adminToken);
  const msgsAfterWaDisabled = await request('/birthdays/messages', 'GET', undefined, adminToken);
  const sentForBdayDonor2 = (msgsAfterWaDisabled.data || []).filter(
    (m: any) => m.donorId === bdayDonor2.data?.id
  );
  await request('/settings', 'PUT', { AUTO_WHATSAPP_ENABLED: 'true' }, adminToken);
  record(
    'R10',
    'Birthday automation respects AUTO_WHATSAPP_ENABLED=false setting',
    sentForBdayDonor2.length === 0,
    `messagesDispatchedWhenWaDisabled=${sentForBdayDonor2.length}`
  );

  // ---------------------------------------------------------------------------
  // R11: Scheduled birthday check respects MESSAGING_TIME (e.g., 23:59 in future)
  // ---------------------------------------------------------------------------
  const bdayDonor3 = await request(
    '/donors',
    'POST',
    {
      fullName: 'Future Time Bday Devotee',
      dob: todayIso,
      mobile: '9876500077',
      preferredChannel: 'WHATSAPP',
      whatsappPermission: 'ALLOWED',
    },
    adminToken
  );
  await request('/settings', 'PUT', { MESSAGING_TIME: '23:59' }, adminToken);
  const cronRefreshRes = await request('/crm/refresh', 'POST', undefined, adminToken);
  const msgsAfterCron = await request('/birthdays/messages', 'GET', undefined, adminToken);
  const sentForBdayDonor3 = (msgsAfterCron.data || []).filter(
    (m: any) => m.donorId === bdayDonor3.data?.id
  );
  await request('/settings', 'PUT', { MESSAGING_TIME: '08:00' }, adminToken);
  record(
    'R11',
    'Scheduled 15-min refresh does not send birthday wishes before configured MESSAGING_TIME',
    sentForBdayDonor3.length === 0 && cronRefreshRes.status === 200,
    `sentBeforeMessagingTime=${sentForBdayDonor3.length}`
  );

  // ---------------------------------------------------------------------------
  // R12: Live/Production Meta WhatsApp mode uses pre-approved template payload
  //      for Festivals, Receipts, and Birthdays (verified via local HTTP stub)
  // ---------------------------------------------------------------------------
  const capturedMetaRequests: any[] = [];
  const metaStubServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        capturedMetaRequests.push({ url: req.url, headers: req.headers, body: JSON.parse(body) });
      } catch {
        capturedMetaRequests.push({ url: req.url, body });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ messages: [{ id: `wamid.STUB_${Date.now()}` }] }));
    });
  });

  await new Promise<void>(resolve => metaStubServer.listen(0, '127.0.0.1', () => resolve()));
  const stubAddress = metaStubServer.address() as { port: number };
  const stubBaseUrl = `http://127.0.0.1:${stubAddress.port}`;

  await request(
    '/settings',
    'PUT',
    {
      WHATSAPP_MODE: 'production',
      META_ACCESS_TOKEN: 'EAATestLiveToken123',
      META_PHONE_NUMBER_ID: '109876543210',
      META_GRAPH_BASE_URL: stubBaseUrl,
    },
    adminToken
  );

  // 12a: Trigger festival broadcast in LIVE mode
  await request(
    '/festivals/broadcast',
    'POST',
    {
      festivalId: 'janmashtami',
      includeFamilyMembers: false,
      donorCategoryFilter: 'PLATINUM',
    },
    adminToken
  );
  const festivalMetaCall = capturedMetaRequests.find(
    r => r.body?.type === 'template' && r.body?.template?.name === 'iskcon_janmashtami_blessing_hi'
  );
  record(
    'R12a',
    'Festival broadcast in LIVE mode dispatches Meta HSM template with {{1}} devotee name parameter',
    Boolean(
      festivalMetaCall &&
        festivalMetaCall.body?.template?.components?.[0]?.parameters?.[0]?.type === 'text'
    ),
    festivalMetaCall
      ? `template=${festivalMetaCall.body.template.name}, param1=${festivalMetaCall.body.template.components[0].parameters[0].text}`
      : `Captured calls: ${JSON.stringify(capturedMetaRequests.map(c => c.body))}`
  );

  // 12b: Trigger donation receipt in LIVE mode
  capturedMetaRequests.length = 0;
  await request(
    `/donations/donor/${firstDonor.id}`,
    'POST',
    {
      amount: 2501,
      paymentMethod: 'UPI',
      purpose: 'Live Mode Receipt Template Test',
      sendReceiptNow: true,
    },
    adminToken
  );
  const receiptMetaCall = capturedMetaRequests.find(
    r => r.body?.type === 'template' && r.body?.template?.name === 'iskcon_seva_receipt_hi'
  );
  record(
    'R12b',
    'Donation receipt in LIVE mode dispatches Meta template "iskcon_seva_receipt_hi" with 6 parameters',
    Boolean(
      receiptMetaCall &&
        receiptMetaCall.body?.template?.components?.[0]?.parameters?.length === 6
    ),
    receiptMetaCall
      ? `template=${receiptMetaCall.body.template.name}, paramsCount=${receiptMetaCall.body.template.components[0].parameters.length}`
      : `Captured calls: ${JSON.stringify(capturedMetaRequests.map(c => c.body))}`
  );

  // 12c: Trigger birthday check in LIVE mode for bdayDonor2 (whose birthday wish was skipped when WA was disabled)
  capturedMetaRequests.length = 0;
  await request('/birthdays/trigger-run', 'POST', undefined, adminToken);
  const bdayMetaCall = capturedMetaRequests.find(
    r => r.body?.type === 'template' && r.body?.template?.name === 'iskcon_birthday_blessing_hi'
  );
  record(
    'R12c',
    'Birthday automation in LIVE mode dispatches Meta template "iskcon_birthday_blessing_hi" with {{1}} parameter',
    Boolean(
      bdayMetaCall &&
        bdayMetaCall.body?.template?.components?.[0]?.parameters?.[0]?.type === 'text'
    ),
    bdayMetaCall
      ? `template=${bdayMetaCall.body.template.name}, param1=${bdayMetaCall.body.template.components[0].parameters[0].text}`
      : `Captured calls: ${JSON.stringify(capturedMetaRequests.map(c => c.body))}`
  );

  // Restore mock mode
  await request(
    '/settings',
    'PUT',
    {
      WHATSAPP_MODE: 'mock',
      META_ACCESS_TOKEN: '',
      META_PHONE_NUMBER_ID: '',
      META_GRAPH_BASE_URL: '',
    },
    adminToken
  );
  metaStubServer.close();

  // ---------------------------------------------------------------------------
  // R13: Login rate limiting (Brute-force protection)
  // ---------------------------------------------------------------------------
  let rateLimited = false;
  let lastStatus = 0;
  for (let i = 0; i < 12; i++) {
    const res = await request('/auth/login', 'POST', {
      email: 'ratelimit-test@iskcon.org',
      password: 'wrongpassword',
    });
    lastStatus = res.status;
    if (res.status === 429) {
      rateLimited = true;
      break;
    }
  }
  record(
    'R13',
    'POST /api/auth/login enforces brute-force rate limiting (returns 429 after repeated failures)',
    rateLimited,
    `lastStatus=${lastStatus}`
  );

  console.log('\n================================================================================');
  const passed = results.filter(r => r.passed).length;
  console.log(`📊 SUMMARY: ${passed}/${results.length} Passed`);
  console.log('================================================================================');
  if (passed < results.length) {
    process.exit(1);
  }
}

runSecondPassTests().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
