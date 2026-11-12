// =============================================================================
// ZAVEN SUPABASE EDGE FUNCTION: submit-order-receipt
// 1. Validates customer full name, phone, and optional receipt file (image/PDF <= 5MB).
// 2. Stores receipt privately in `payment-receipts` bucket using service_role key.
// 3. Marks transfer order as `pending_verification` ("Toʻlov tekshirilmoqda").
// 4. Sends order + receipt alert to the owner's Telegram via server-only
//    `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ADMIN_CHAT_ID`.
// 5. Never fails or loses the order if Telegram is unconfigured or unreachable.
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { order, receiptBase64 } = body;

    if (
      !order ||
      !order.orderNumber ||
      !order.customerName?.trim() ||
      !order.customerPhone?.trim()
    ) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Customer full name, phone number, and order details are required.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
    const telegramChatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') || '';

    let storedReceiptPath: string | null = null;

    // 1. Validate & upload receipt to private Supabase Storage if provided
    if (order.paymentReceipt && receiptBase64) {
      const { fileName, mimeType, fileSize } = order.paymentReceipt;

      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'Invalid receipt format. Allowed: JPG, PNG, WEBP, PDF.',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (fileSize > MAX_FILE_BYTES) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'Receipt file exceeds the 5 MB limit.',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (supabaseUrl && serviceRoleKey) {
        const adminClient = createClient(supabaseUrl, serviceRoleKey);
        const cleanBase64 = receiptBase64.replace(/^data:[^;]+;base64,/, '');
        const binaryStr = atob(cleanBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const objectPath = `${order.orderNumber}/${Date.now()}_${safeName}`;

        const { error: uploadErr } = await adminClient.storage
          .from('payment-receipts')
          .upload(objectPath, bytes, {
            contentType: mimeType,
            upsert: false,
          });

        if (!uploadErr) {
          storedReceiptPath = objectPath;
        }
      }
    }

    // 2. Send Telegram Notification via Server-Only Bot Token (Never exposed to browser)
    let telegramStatus: 'not_configured' | 'sent' | 'failed' = 'not_configured';
    let telegramError: string | undefined = undefined;

    if (telegramBotToken && telegramChatId) {
      try {
        const itemsSummary = (order.items || [])
          .map(
            (i: { productName: string; quantity: number; sku: string }) =>
              `• ${i.productName} (${i.sku}) × ${i.quantity}`
          )
          .join('\n');

        const verificationBadge =
          order.paymentVerificationStatus === 'pending_verification'
            ? '⏳ Toʻlov tekshirilmoqda (Chek yuklangan)'
            : 'Naqd / Qabul qilganda toʻlov';

        const messageText = [
          `🛍 <b>ZAVEN — YANGI BUYURTMA #${order.orderNumber}</b>`,
          ``,
          `👤 <b>Xaridor:</b> ${order.customerName}`,
          `📞 <b>Telefon:</b> ${order.customerPhone}`,
          order.customerEmail ? `✉️ <b>Email:</b> ${order.customerEmail}` : '',
          `📍 <b>Manzil:</b> ${order.region}, ${order.address}`,
          `💳 <b>Toʻlov usuli:</b> ${order.paymentMethodLabel}`,
          `🔍 <b>Toʻlov holati:</b> ${verificationBadge}`,
          `💰 <b>Jami summa:</b> ${order.totalAmount} soʻm`,
          order.paymentReceipt
            ? `📎 <b>Chek fayli:</b> ${order.paymentReceipt.fileName}`
            : '',
          ``,
          `📦 <b>Mahsulotlar:</b>`,
          itemsSummary,
        ]
          .filter(Boolean)
          .join('\n');

        const tgRes = await fetch(
          `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: messageText,
              parse_mode: 'HTML',
            }),
          }
        );

        if (tgRes.ok) {
          telegramStatus = 'sent';
        } else {
          const errJson = await tgRes.json().catch(() => ({}));
          telegramStatus = 'failed';
          telegramError =
            errJson.description || `Telegram HTTP ${tgRes.status}`;
        }
      } catch (tgErr) {
        telegramStatus = 'failed';
        telegramError =
          tgErr instanceof Error
            ? tgErr.message
            : 'Telegram network request failed';
      }
    }

    // 3. Persist order record in Postgres if Supabase is connected
    if (supabaseUrl && serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      await adminClient.from('orders').upsert({
        order_number: order.orderNumber,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        customer_email: order.customerEmail || null,
        region: order.region,
        address: order.address,
        customer_note: order.customerNote || null,
        internal_notes: order.internalNotes || [],
        items: order.items || [],
        subtotal: order.subtotal,
        discount_amount: order.discountAmount || 0,
        coupon_code: order.couponCode || null,
        delivery_fee: order.deliveryFee || 0,
        total_amount: order.totalAmount,
        payment_method_id: order.paymentMethodId,
        payment_method_label: order.paymentMethodLabel,
        payment_receipt_path: storedReceiptPath,
        payment_receipt_filename: order.paymentReceipt?.fileName || null,
        payment_receipt_mime: order.paymentReceipt?.mimeType || null,
        payment_receipt_size: order.paymentReceipt?.fileSize || null,
        payment_verification_status: order.paymentVerificationStatus,
        telegram_notification_status: telegramStatus,
        telegram_notification_error: telegramError || null,
        status: 'new',
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        storedReceiptPath,
        telegramNotificationStatus: telegramStatus,
        telegramNotificationError: telegramError,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : 'Server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});