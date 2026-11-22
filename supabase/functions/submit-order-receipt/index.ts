import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
};

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

interface SubmitOrderPayload {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerTelegram?: string;
  region: string;
  district?: string;
  address: string;
  locationCoordinates?: { lat: number; lng: number };
  customerNote?: string;
  internalNotes?: string[];
  items?: { productName: string; quantity: number; totalPrice: number }[];
  subtotal: number;
  discountAmount?: number;
  couponCode?: string;
  deliveryFee?: number;
  totalAmount: number;
  paymentMethodId: string;
  paymentMethodLabel: string;
  paymentVerificationStatus?: string;
  paymentReceipt?: {
    mimeType?: string;
    fileName?: string;
    fileSize?: number;
  };
}

interface StoredOrder {
  id: string;
  order_number: string;
  customer_phone: string;
  total_amount: number;
  payment_receipt_path: string | null;
  idempotency_payload_hash: string | null;
  telegram_notification_status?: string | null;
  telegram_notification_error?: string | null;
}

const isSubmitOrderPayload = (value: unknown): value is SubmitOrderPayload => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.orderNumber === 'string' &&
    /^ZVN-[A-F0-9]{32}$/.test(candidate.orderNumber) &&
    typeof candidate.customerName === 'string' &&
    Boolean(candidate.customerName.trim()) &&
    typeof candidate.customerPhone === 'string' &&
    Boolean(candidate.customerPhone.trim()) &&
    Number.isFinite(Number(candidate.totalAmount)) &&
    Number(candidate.totalAmount) >= 0
  );
};

const jsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
const displayOrderNumber = (orderNumber: string) => {
  const match = /^ZVN-([A-F0-9]{32})$/i.exec(orderNumber);
  return match ? `ZVN-${match[1].slice(0, 12).toUpperCase()}` : orderNumber;
};

async function findOrCreateCustomer(
  adminClient: ReturnType<typeof createClient>,
  order: SubmitOrderPayload
) {
  const email = order.customerEmail?.trim().toLowerCase() || null;
  let existingCustomer: {
    id: string;
    addresses: unknown;
    auth_user_id?: string | null;
  } | null = null;

  if (email) {
    const lookup = await adminClient
      .from('customers')
      .select('id,addresses,auth_user_id')
      .ilike('email', email)
      .maybeSingle();
    if (lookup.error) throw new Error(`Mijozni tekshirib boʻlmadi: ${lookup.error.message}`);
    existingCustomer = lookup.data;
  }

  if (!existingCustomer) {
    const lookup = await adminClient
      .from('customers')
      .select('id,addresses,auth_user_id')
      .eq('phone', order.customerPhone)
      .maybeSingle();
    if (lookup.error) throw new Error(`Mijozni tekshirib boʻlmadi: ${lookup.error.message}`);
    existingCustomer = lookup.data;
  }

  const identity = email || normalizePhone(order.customerPhone);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(identity)
  );
  const stableCustomerId = `cust-${Array.from(new Uint8Array(digest))
    .slice(0, 12)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')}`;
  const customerId = existingCustomer?.id || stableCustomerId;

  const { data: customer, error: saveCustomerError } = await adminClient
    .from('customers')
    .upsert(
      {
        id: customerId,
        full_name: order.customerName,
        phone: order.customerPhone,
        email,
        addresses:
          existingCustomer?.addresses || [
            {
              id: `addr-${crypto.randomUUID()}`,
              title: 'Asosiy manzil',
              region: order.region,
              district: order.district || '',
              addressLine: order.address,
              isDefault: true,
            },
          ],
        auth_user_id: existingCustomer?.auth_user_id || null,
      },
      { onConflict: 'id' }
    )
    .select('id')
    .maybeSingle();

  if (saveCustomerError || !customer?.id) {
    throw new Error(
      `Mijoz maʼlumotlarini saqlab boʻlmadi: ${saveCustomerError?.message || 'Bazadan tasdiq kelmadi.'}`
    );
  }

  const [byEmail, byPhone] = await Promise.all([
    email
      ? adminClient
          .from('orders')
          .select('id,total_amount,status,is_deleted,created_at')
          .ilike('customer_email', email)
      : Promise.resolve({ data: [], error: null }),
    adminClient
      .from('orders')
      .select('id,total_amount,status,is_deleted,created_at')
      .eq('customer_phone', order.customerPhone),
  ]);
  if (byEmail.error || byPhone.error) {
    throw new Error(
      `Mijoz buyurtmalari hisoblanmadi: ${byEmail.error?.message || byPhone.error?.message}`
    );
  }

  const orders = new Map(
    [...(byEmail.data || []), ...(byPhone.data || [])]
      .filter((item) => !item.is_deleted)
      .map((item) => [item.id, item])
  );
  const countableOrders = [...orders.values()].filter(
    (item) => item.status !== 'cancelled'
  );
  const lastOrder = [...orders.values()].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];

  const { data: updatedCustomer, error: totalsError } = await adminClient
    .from('customers')
    .update({
      order_count: countableOrders.length,
      total_spent: countableOrders.reduce(
        (total, item) => total + Number(item.total_amount || 0),
        0
      ),
      last_order_date: lastOrder?.created_at || null,
    })
    .eq('id', customer.id)
    .select('id')
    .maybeSingle();
  if (totalsError || !updatedCustomer?.id) {
    throw new Error(
      `Mijoz buyurtma jami yangilanmadi: ${totalsError?.message || 'Bazadan tasdiq kelmadi.'}`
    );
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Faqat POST soʻrovi qoʻllab-quvvatlanadi.' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
    const telegramAdminChatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') || '';
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, {
        ok: false,
        error: 'Edge Function sozlamalari toʻliq emas: SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY kerak.',
      });
    }

    let parsedBody: unknown;
    try {
      parsedBody = await req.json();
    } catch {
      return jsonResponse(400, { ok: false, error: 'Soʻrov JSON formati notoʻgʻri.' });
    }
    if (!parsedBody || typeof parsedBody !== 'object') {
      return jsonResponse(400, { ok: false, error: 'Soʻrov tanasi notoʻgʻri.' });
    }

    const body = parsedBody as Record<string, unknown>;
    const order = body.order;
    if (!isSubmitOrderPayload(order)) {
      return jsonResponse(400, { ok: false, error: 'Buyurtma maʼlumotlari notoʻgʻri.' });
    }
    const fingerprintBytes = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify(order))
    );
    const idempotencyPayloadHash = Array.from(new Uint8Array(fingerprintBytes))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    const receiptBase64 =
      typeof body.receiptBase64 === 'string' ? body.receiptBase64 : null;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: existingOrder, error: lookupError } = await adminClient
      .from('orders')
      .select('id,order_number,customer_phone,total_amount,payment_receipt_path,idempotency_payload_hash,telegram_notification_status,telegram_notification_error')
      .eq('order_number', order.orderNumber)
      .maybeSingle();
    if (lookupError) {
      return jsonResponse(500, {
        ok: false,
        error: `Buyurtma holatini tekshirib boʻlmadi: ${lookupError.message}`,
      });
    }

    let existing = existingOrder as StoredOrder | null;
    if (
      existing &&
      ((existing.idempotency_payload_hash &&
        existing.idempotency_payload_hash !== idempotencyPayloadHash) ||
        (!existing.idempotency_payload_hash &&
          (normalizePhone(existing.customer_phone) !== normalizePhone(order.customerPhone) ||
            Number(existing.total_amount) !== Math.round(Number(order.totalAmount)))))
    ) {
      return jsonResponse(409, {
        ok: false,
        error: 'Bu buyurtma urinishidagi maʼlumotlar oʻzgargan. Yangi buyurtma urinishini boshlang.',
      });
    }

    const receiptRequired =
      order.paymentVerificationStatus === 'pending_verification';
    if (receiptRequired && !order.paymentReceipt) {
      return jsonResponse(400, { ok: false, error: 'Toʻlov cheki biriktirilmagan.' });
    }

    let receiptPath = existing?.payment_receipt_path || null;
    let receiptBytes: Uint8Array | null = null;
    const receiptMime = order.paymentReceipt?.mimeType || 'image/jpeg';
    const receiptName = order.paymentReceipt?.fileName || 'receipt.jpg';

    if (!receiptPath && order.paymentReceipt && receiptBase64) {
      if (!ALLOWED_MIMES.includes(receiptMime)) {
        return jsonResponse(400, {
          ok: false,
          error: 'Fayl turi qoʻllab-quvvatlanmaydi. JPG, PNG, WEBP yoki PDF tanlang.',
        });
      }

      try {
        const base64 = receiptBase64.includes(',')
          ? receiptBase64.split(',')[1]
          : receiptBase64;
        const binary = atob(base64);
        receiptBytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      } catch {
        return jsonResponse(400, { ok: false, error: 'Chek fayli notoʻgʻri kodlangan.' });
      }
      if (!receiptBytes.byteLength || receiptBytes.byteLength > MAX_SIZE_BYTES) {
        return jsonResponse(400, { ok: false, error: 'Chek boʻsh yoki 5 MB hajm chegarasidan oshgan.' });
      }

      const safeName = receiptName.replace(/[^a-zA-Z0-9._-]/g, '_');
      receiptPath = `${order.orderNumber}/receipt_${idempotencyPayloadHash.slice(0, 16)}_${safeName}`;
      const { error: uploadError } = await adminClient.storage
        .from('payment-receipts')
        .upload(receiptPath, receiptBytes, {
          contentType: receiptMime,
          upsert: true,
        });
      if (uploadError) {
        return jsonResponse(500, {
          ok: false,
          error: `Toʻlov cheki saqlanmadi: ${uploadError.message}`,
        });
      }
    } else if (order.paymentReceipt && !receiptPath) {
      return jsonResponse(400, {
        ok: false,
        error: 'Chek fayli yoʻq. Chekni qayta tanlab yuboring.',
      });
    }

    if (receiptPath) {
      const { data: savedReceipt, error: receiptError } = await adminClient.storage
        .from('payment-receipts')
        .download(receiptPath);
      if (receiptError || !savedReceipt || savedReceipt.size === 0) {
        return jsonResponse(500, {
          ok: false,
          error: `Chek saqlanganini tasdiqlab boʻlmadi: ${receiptError?.message || 'Fayl topilmadi yoki boʻsh.'}`,
        });
      }
    }

    let persistedOrder: StoredOrder;
    if (existing && (!order.paymentReceipt || existing.payment_receipt_path)) {
      persistedOrder = existing;
    } else {
      const { data, error: saveOrderError } = await adminClient
        .from('orders')
        .insert({
            order_number: order.orderNumber,
            idempotency_payload_hash: idempotencyPayloadHash,
            customer_name: order.customerName,
            customer_phone: order.customerPhone,
            customer_email: order.customerEmail || null,
            customer_telegram: order.customerTelegram || null,
            region: order.region,
            district: order.district || null,
            address: order.address,
            location_coordinates: order.locationCoordinates || null,
            customer_note: order.customerNote || null,
            internal_notes: order.internalNotes || [],
            items: order.items || [],
            subtotal: Math.round(Number(order.subtotal || 0)),
            discount_amount: Math.round(Number(order.discountAmount || 0)),
            coupon_code: order.couponCode || null,
            delivery_fee: Math.round(Number(order.deliveryFee || 0)),
            total_amount: Math.round(Number(order.totalAmount)),
            payment_method_id: order.paymentMethodId,
            payment_method_label: order.paymentMethodLabel,
            payment_receipt_path: receiptPath,
            payment_receipt_filename: order.paymentReceipt?.fileName || null,
            payment_receipt_mime: order.paymentReceipt?.mimeType || null,
            payment_receipt_size: order.paymentReceipt?.fileSize || null,
            payment_verification_status:
              order.paymentVerificationStatus || 'not_required',
            status: 'new',
          })
        .select('id,order_number,customer_phone,total_amount,payment_receipt_path')
        .maybeSingle();

      if (saveOrderError?.code === '23505') {
        const duplicateLookup = await adminClient
          .from('orders')
          .select('id,order_number,customer_phone,total_amount,payment_receipt_path,idempotency_payload_hash,telegram_notification_status,telegram_notification_error')
          .eq('order_number', order.orderNumber)
          .maybeSingle();
        if (duplicateLookup.error || !duplicateLookup.data) {
          return jsonResponse(500, {
            ok: false,
            error: 'Takroriy buyurtma holatini bazadan tasdiqlab boʻlmadi. Qayta urinib koʻring.',
          });
        }
        existing = duplicateLookup.data as StoredOrder;
        if (
          (existing.idempotency_payload_hash &&
            existing.idempotency_payload_hash !== idempotencyPayloadHash) ||
          (!existing.idempotency_payload_hash &&
            (normalizePhone(existing.customer_phone) !== normalizePhone(order.customerPhone) ||
              Number(existing.total_amount) !== Math.round(Number(order.totalAmount))))
        ) {
          if (receiptPath && receiptPath !== existing.payment_receipt_path) {
            const { error: cleanupError } = await adminClient.storage
              .from('payment-receipts')
              .remove([receiptPath]);
            if (cleanupError) {
              return jsonResponse(500, {
                ok: false,
                error:
                  'Takroriy soʻrov aniqlandi, ammo vaqtinchalik chek nusxasini tozalash tasdiqlanmadi. Yordam xizmatiga murojaat qiling.',
              });
            }
          }
          return jsonResponse(409, {
            ok: false,
            error: 'Bu buyurtma urinishidagi maʼlumotlar oʻzgargan. Yangi buyurtma urinishini boshlang.',
          });
        }
        persistedOrder = existing;
      } else if (saveOrderError || !data?.id || !data.order_number) {
        return jsonResponse(500, {
          ok: false,
          error: `Buyurtma saqlanmadi: ${saveOrderError?.message || 'Bazadan tasdiq kelmadi.'}`,
        });
      } else {
        persistedOrder = {
          ...(data as StoredOrder),
          idempotency_payload_hash: idempotencyPayloadHash,
        };
      }
    }

    if (
      persistedOrder.order_number !== order.orderNumber ||
      (receiptRequired && !persistedOrder.payment_receipt_path)
    ) {
      return jsonResponse(500, {
        ok: false,
        error: 'Bazadagi buyurtma yoki chek maʼlumotlari tasdiqlanmadi.',
      });
    }

    await findOrCreateCustomer(adminClient, order);

    let telegramStatus = existing?.telegram_notification_status || 'not_configured';
    let telegramError = existing?.telegram_notification_error || null;
    if (!existing && telegramBotToken && telegramAdminChatId) {
      try {
        const itemSummary = (order.items || [])
          .map((item) => `• ${item.productName} (${item.quantity}x) — ${item.totalPrice} UZS`)
          .join('\n');
        const text = [
          `🛍 *ZAVEN — YANGI BUYURTMA #${displayOrderNumber(order.orderNumber)}*`,
          `👤 Mijoz: ${order.customerName}`,
          `📞 Tel: ${order.customerPhone}`,
          `📍 Manzil: ${order.region}, ${order.address}`,
          `💳 Toʻlov: ${order.paymentMethodLabel}`,
          `💰 *Jami: ${order.totalAmount} soʻm*`,
          `\n📦 *Mahsulotlar:*\n${itemSummary}`,
        ].join('\n');
        const form = new FormData();
        form.append('chat_id', telegramAdminChatId);
        form.append('caption', text.slice(0, 1020));
        form.append('parse_mode', 'Markdown');
        if (receiptBytes && order.paymentReceipt && receiptMime.startsWith('image/')) {
          form.append(
            'photo',
            new Blob([receiptBytes], { type: receiptMime }),
            receiptName
          );
        } else if (receiptBytes && order.paymentReceipt && receiptMime === 'application/pdf') {
          form.append(
            'document',
            new Blob([receiptBytes], { type: receiptMime }),
            receiptName
          );
        } else {
          form.delete('caption');
          form.delete('parse_mode');
          form.append('text', text);
        }
        const method = receiptBytes
          ? receiptMime === 'application/pdf'
            ? 'sendDocument'
            : 'sendPhoto'
          : 'sendMessage';
        const response = await fetch(
          `https://api.telegram.org/bot${telegramBotToken}/${method}`,
          { method: 'POST', body: method === 'sendMessage' ? JSON.stringify({
            chat_id: telegramAdminChatId,
            text,
            parse_mode: 'Markdown',
          }) : form,
            ...(method === 'sendMessage'
              ? { headers: { 'Content-Type': 'application/json' } }
              : {}),
          }
        );
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.description || `Telegram HTTP ${response.status}`);
        }
        telegramStatus = 'sent';
      } catch (error) {
        telegramStatus = 'failed';
        telegramError = error instanceof Error ? error.message : 'Telegram yuborilmadi.';
      }

      const { error: notificationUpdateError } = await adminClient
        .from('orders')
        .update({
          telegram_notification_status: telegramStatus,
          telegram_notification_error: telegramError,
        })
        .eq('order_number', order.orderNumber);
      if (notificationUpdateError) {
        telegramError = `Buyurtma saqlandi, lekin Telegram holati yangilanmadi: ${notificationUpdateError.message}`;
      }
    }

    return jsonResponse(200, {
      ok: true,
      orderId: persistedOrder.id,
      orderNumber: persistedOrder.order_number,
      storedReceiptPath: persistedOrder.payment_receipt_path,
      telegramNotificationStatus: telegramStatus,
      telegramNotificationError: telegramError,
      reused: Boolean(existing),
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Ichki server xatoligi.',
    });
  }
});
