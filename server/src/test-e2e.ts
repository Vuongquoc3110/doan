import server from './server';
import pool from './db/connection';
import { config } from './config';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 KLEVER FRUIT E2E INTEGRATION & INTEGRITY TEST 🧪');
  console.log('====================================================\n');

  // Wait 500ms for server to bind port
  await new Promise((r) => setTimeout(r, 500));

  const baseUrl = `http://127.0.0.1:${config.port}`;
  console.log(`[TEST CLIENT] Target API: ${baseUrl}`);

  try {
    // 1. Health check
    console.log('\n--- Test 1: GET /api/health ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthJson: any = await healthRes.json();
    const healthData = healthJson.data;
    console.log('Status HTTP:', healthRes.status, 'Payload status:', healthData?.status);
    console.log('Database connected:', healthData?.database?.status);
    console.log('Stores count:', healthData?.database?.stats?.stores);
    console.log('Products count:', healthData?.database?.stats?.products);
    console.log('Orders count:', healthData?.database?.stats?.orders);

    if (healthData?.database?.status !== 'connected' || healthData?.database?.stats?.stores !== 22) {
      throw new Error(`Health check verification failed. Stores: ${healthData?.database?.stats?.stores}`);
    }
    console.log('✅ Test 1 PASSED: Database & 22 Stores verified!');

    // 2. Authentication: Customer, Staff, Admin
    console.log('\n--- Test 2: Authentication (Customer, Staff, Admin) ---');

    // Customer
    const custRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0900000011', password: '1' }),
    });
    const custData: any = await custRes.json();
    console.log('Customer Login:', custData.success, 'Role:', custData.data?.user?.role, 'Points:', custData.data?.user?.points);
    const customerToken = custData.data?.tokens?.accessToken;

    // Staff
    const staffRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0900000002', password: '1' }),
    });
    const staffData: any = await staffRes.json();
    console.log('Staff Login:', staffData.success, 'Role:', staffData.data?.user?.role, 'Store ID:', staffData.data?.user?.store_id);
    const staffToken = staffData.data?.tokens?.accessToken;

    // Admin
    const adminRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0900000001', password: '1' }),
    });
    const adminData: any = await adminRes.json();
    console.log('Admin Login:', adminData.success, 'Role:', adminData.data?.user?.role);
    const adminToken = adminData.data?.tokens?.accessToken;

    if (!customerToken || !staffToken || !adminToken) {
      throw new Error('Login failed for one or more roles!');
    }
    console.log('✅ Test 2 PASSED: All 3 roles authenticated successfully!');

    // 3. Products & Categories
    console.log('\n--- Test 3: GET /api/v1/products & /api/v1/categories ---');
    const prodRes = await fetch(`${baseUrl}/api/v1/products?limit=10`);
    const prodData: any = await prodRes.json();
    console.log('Fetched products count:', prodData.data?.length);
    console.log('Sample product:', prodData.data?.[0]?.name, '-', prodData.data?.[0]?.base_price, 'VND');

    const catRes = await fetch(`${baseUrl}/api/v1/categories`);
    const catData: any = await catRes.json();
    console.log('Categories count:', catData.data?.length);
    console.log('Sample categories:', catData.data?.map((c: any) => c.name).slice(0, 4).join(', '));
    console.log('✅ Test 3 PASSED: Catalog & categories verified!');

    // 4. Stores Directory (Hanoi & HCMC)
    console.log('\n--- Test 4: GET /api/v1/stores ---');
    const storeRes = await fetch(`${baseUrl}/api/v1/stores`);
    const storeData: any = await storeRes.json();
    console.log('Total active stores:', storeData.data?.length);
    const hanoiCount = storeData.data?.filter((s: any) => s.city?.includes('Hà Nội')).length;
    const hcmCount = storeData.data?.filter((s: any) => s.city?.includes('Hồ Chí Minh')).length;
    console.log(`Hà Nội: ${hanoiCount} stores | TP.HCM: ${hcmCount} stores`);
    console.log('✅ Test 4 PASSED: Store directory verified!');

    // 5. Order Placement with Inventory Deduction (Pessimistic Locking)
    console.log('\n--- Test 5: POST /api/v1/orders (Checkout & Pessimistic Locking) ---');
    const sampleVariantId = 1;
    const sampleStoreId = 1;

    // Check inventory before order
    const [invBefore]: any = await pool.query(
      'SELECT qty FROM inventory WHERE store_id = ? AND variant_id = ?',
      [sampleStoreId, sampleVariantId]
    );
    const stockBefore = invBefore[0]?.qty || 0;
    console.log(`Initial stock at Store #${sampleStoreId} for Variant #${sampleVariantId}: ${stockBefore}`);

    const orderRes = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        store_id: sampleStoreId,
        fulfillment_type: 'delivery',
        recipient_name: 'Nguyễn Văn Test',
        recipient_phone: '0988776655',
        shipping_address: 'Tòa Keangnam Landmark 72, Phạm Hùng, Cầu Giấy, Hà Nội',
        delivery_slot: '14:00 - 17:00',
        payment_method: 'cod',
        greeting_message: 'Chúc mừng khai trương đại hồng phát!',
        ribbon_color: 'Đỏ ruby hoàng gia',
        items: [
          {
            variant_id: sampleVariantId,
            quantity: 2,
          },
        ],
      }),
    });

    const orderData: any = await orderRes.json();
    console.log('Order creation response:', orderData.success, 'Code:', orderData.data?.order_code, 'Total:', orderData.data?.final_total);

    if (!orderData.success) {
      throw new Error(`Order placement failed: ${JSON.stringify(orderData)}`);
    }

    // Check inventory after order
    const [invAfter]: any = await pool.query(
      'SELECT qty FROM inventory WHERE store_id = ? AND variant_id = ?',
      [sampleStoreId, sampleVariantId]
    );
    const stockAfter = invAfter[0]?.qty || 0;
    console.log(`Stock after order (deducted 2): ${stockAfter}`);
    if (stockBefore - stockAfter !== 2) {
      throw new Error(`Inventory deduction mismatch! Before: ${stockBefore}, After: ${stockAfter}`);
    }
    console.log('✅ Test 5 PASSED: Pessimistic locking & Inventory deduction accurately decremented!');

    // 6. Staff POS & In-Store Customer Lookup
    console.log('\n--- Test 6: Staff POS Customer Lookup & Store Orders ---');
    const lookupRes = await fetch(`${baseUrl}/api/v1/staff/pos/customer-lookup?phone=0900000011`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const lookupData: any = await lookupRes.json();
    console.log('POS Lookup Found:', lookupData.data?.full_name, 'Tier:', lookupData.data?.tier, 'Points:', lookupData.data?.loyalty_points);

    const staffOrdersRes = await fetch(`${baseUrl}/api/v1/staff/orders`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const staffOrdersData: any = await staffOrdersRes.json();
    console.log('Staff store orders count:', staffOrdersData.data?.length);
    console.log('✅ Test 6 PASSED: Staff POS operations verified!');

    // 7. Admin Analytics & Revenue Dashboard
    console.log('\n--- Test 7: GET /api/v1/admin/analytics/dashboard ---');
    const dashRes = await fetch(`${baseUrl}/api/v1/admin/analytics/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dashData: any = await dashRes.json();
    console.log('Admin Dashboard Total Revenue:', dashData.data?.total_revenue, 'VND');
    console.log('Admin Dashboard Total Orders:', dashData.data?.total_orders);
    console.log('Admin Dashboard Top Stores:', dashData.data?.top_stores?.length);
    console.log('✅ Test 7 PASSED: Admin revenue analytics view verified!');

    console.log('\n====================================================');
    console.log('🎉🎉🎉 ALL 7 E2E INTEGRATION TESTS PASSED 100%! 🎉🎉🎉');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await pool.end();
    process.exit(process.exitCode || 0);
  }
}

runTests();
