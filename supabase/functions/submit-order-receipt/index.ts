import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
    const telegramAdminChatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? '';

    const body = await req.json();
    const order = body?.order;
    const receiptBase64: string | null = body?.receiptBase64 ?? null;

    if (!order || !order.orderNumber || !order.customerPhone) {
      return new Response(
        JSON.stringify({ error: 'Invalid order payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let storedReceiptPath: string | null =
      order.paymentReceipt?.storagePath ?? null;
    let binaryReceiptBytes: Uint8Array | null = null;
    let receiptMimeType = 'image/jpeg';
    let receiptFileName = 'receipt.jpg';

    // 1. Validate & upload receipt to private `payment-receipts` bucket if attached
    if (receiptBase64 && order.paymentReceipt) {
      receiptMimeType = order.paymentReceipt.mimeType || 'image/jpeg';
      receiptFileName = order.paymentReceipt.fileName || 'receipt.jpg';

      if (!ALLOWED_MIMES.includes(receiptMimeType)) {
        return new Response(
          JSON.stringify({
            error: 'Unsupported receipt file type. Use JPG, PNG, WEBP, or PDF.',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const base64Clean = receiptBase64.includes(',')
        ? receiptBase64.split(',')[1]
        : receiptBase64;
      const binaryStr = atob(base64Clean);
      binaryReceiptBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        binaryReceiptBytes[i] = binaryStr.charCodeAt(i);
      }

      if (binaryReceiptBytes.byteLength > MAX_SIZE_BYTES) {
        return new Response(
          JSON.stringify({ error: 'Receipt file exceeds 5 MB limit.' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const safeFileName = receiptFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${order.orderNumber}/${Date.now()}_${safeFileName}`;

      const { error: uploadError } = await adminClient.storage
        .from('payment-receipts')
        .upload(storagePath, binaryReceiptBytes, {
          contentType: receiptMimeType,
          upsert: true,
        });

      if (!uploadError) {
        storedReceiptPath = storagePath;
      }
    }

    // 2. Send server-side Telegram notification to Admin Chat if configured
    let telegramNotificationStatus: 'not_configured' | 'sent' | 'failed' =
      'not_configured';
    let telegramNotificationError: string | null = null;

    if (telegramBotToken && telegramAdminChatId) {
      try {
        const itemsSummary = Array.isArray(order.items)
          ? order.items
              .map(
                (i: {
                  productName: string;
                  quantity: number;
                  totalPrice: number;
                }) => `• ${i.productName} (${i.quantity}x) — ${i.totalPrice} UZS`
              )
              .join('\n')
          : '';

        const locationLine = order.district
          ? `${order.region}, ${order.district}, ${order.address}`
          : `${order.region}, ${order.address}`;

        const gpsLine =
          order.locationCoordinates &&
          typeof order.locationCoordinates.lat === 'number' &&
          typeof order.locationCoordinates.lng === 'number'
            ? `📍 GPS: https://www.google.com/maps?q=${order.locationCoordinates.lat},${order.locationCoordinates.lng}`
            : null;

        const telegramLine = order.customerTelegram
          ? `✈️ Telegram: ${order.customerTelegram}`
          : null;

        const emailLine = order.customerEmail
          ? `✉️ Email: ${order.customerEmail}`
          : null;

        const captionLines = [
          `🛍 *ZAVEN — YANGI BUYURTMA #${order.orderNumber}*`,
          `👤 Mijoz: ${order.customerName}`,
          `📞 Tel: ${order.customerPhone}`,
          ...(emailLine ? [emailLine] : []),
          ...(telegramLine ? [telegramLine] : []),
          `📍 Manzil: ${locationLine}`,
          ...(gpsLine ? [gpsLine] : []),
          `💳 Toʻlov usuli: ${order.paymentMethodLabel}`,
          `🔍 Toʻlov holati: ${
            order.paymentVerificationStatus === 'pending_verification'
              ? '⏳ Toʻlov tekshirilmoqda (Chek ilova qilingan)'
              : 'Qabul qilganda toʻlov'
          }`,
          `💰 *Jami summa: ${order.totalAmount} soʻm*`,
          `\n📦 *Mahsulotlar:*\n${itemsSummary}`,
        ].join('\n');

        if (binaryReceiptBytes && receiptMimeType.startsWith('image/')) {
          const form = new FormData();
          form.append('chat_id', telegramAdminChatId);
          form.append('caption', captionLines.slice(0, 1020));
          form.append('parse_mode', 'Markdown');
          form.append(
            'photo',
            new Blob([binaryReceiptBytes], { type: receiptMimeType }),
            receiptFileName
          );

          const tgRes = await fetch(
            `https://api.telegram.org/bot${telegramBotToken}/sendPhoto`,
            {
              method: 'POST',
              body: form,
            }
          );
          if (!tgRes.ok) {
            const errJson = await tgRes.json().catch(() => ({}));
            throw new Error(
              errJson.description || `Telegram HTTP ${tgRes.status}`
            );
          }
          telegramNotificationStatus = 'sent';
        } else if (binaryReceiptBytes && receiptMimeType === 'application/pdf') {
          const form = new FormData();
          form.append('chat_id', telegramAdminChatId);
          form.append('caption', captionLines.slice(0, 1020));
          form.append('parse_mode', 'Markdown');
          form.append(
            'document',
            new Blob([binaryReceiptBytes], { type: receiptMimeType }),
            receiptFileName
          );

          const tgRes = await fetch(
            `https://api.telegram.org/bot${telegramBotToken}/sendDocument`,
            {
              method: 'POST',
              body: form,
            }
          );
          if (!tgRes.ok) {
            const errJson = await tgRes.json().catch(() => ({}));
            throw new Error(
              errJson.description || `Telegram HTTP ${tgRes.status}`
            );
          }
          telegramNotificationStatus = 'sent';
        } else {
          const tgRes = await fetch(
            `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: telegramAdminChatId,
                text: captionLines,
                parse_mode: 'Markdown',
              }),
            }
          );
          if (!tgRes.ok) {
            const errJson = await tgRes.json().catch(() => ({}));
            throw new Error(
              errJson.description || `Telegram HTTP ${tgRes.status}`
            );
          }
          telegramNotificationStatus = 'sent';
        }
      } catch (tgErr) {
        telegramNotificationStatus = 'failed';
        telegramNotificationError =
          tgErr instanceof Error ? tgErr.message : 'Telegram send failed';
      }
    }

    // 3. Upsert order record into PostgreSQL `public.orders`
    await adminClient.from('orders').upsert(
      {
        order_number: order.orderNumber,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        customer_email: order.customerEmail ?? null,
        customer_telegram: order.customerTelegram ?? null,
        region: order.region,
        district: order.district ?? null,
        address: order.address,
        location_coordinates: order.locationCoordinates ?? null,
        customer_note: order.customerNote ?? null,
        internal_notes: order.internalNotes ?? [],
        items: order.items ?? [],
        subtotal: Math.round(Number(order.subtotal || 0)),
        discount_amount: Math.round(Number(order.discountAmount || 0)),
        coupon_code: order.couponCode ?? null,
        delivery_fee: Math.round(Number(order.deliveryFee || 0)),
        total_amount: Math.round(Number(order.totalAmount || 0)),
        payment_method_id: order.paymentMethodId,
        payment_method_label: order.paymentMethodLabel,
        payment_receipt_path: storedReceiptPath,
        payment_receipt_filename: order.paymentReceipt?.fileName ?? null,
        payment_receipt_mime: order.paymentReceipt?.mimeType ?? null,
        payment_receipt_size: order.paymentReceipt?.fileSize ?? null,
        payment_verification_status:
          order.paymentVerificationStatus ?? 'not_required',
        telegram_notification_status: telegramNotificationStatus,
        telegram_notification_error: telegramNotificationError,
        status: order.status ?? 'new',
      },
      { onConflict: 'order_number' }
    );

    return new Response(
      JSON.stringify({
        ok: true,
        storedReceiptPath,
        telegramNotificationStatus,
        telegramNotificationError,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
