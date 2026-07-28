# PEIWAY N8N Integration

This module keeps the main system responsible only for business events and callback records.
External notification delivery, such as Telegram or SMS, should be handled by N8N workflows.

## System Pages

- `/settings/n8n`: configure the N8N event webhook, callback URL, and enable switch.
- `/settings/n8n-logs`: view callback records returned by N8N.

## Database Objects

Run:

```text
supabase-step15-n8n-integration.sql
```

It creates:

- `n8n_connection_settings`
- `n8n_callback_logs`
- `n8n_event_dispatch_logs`
- `n8n_event_dedup`

It also removes the deprecated notification tables from the previous integration.

## Outbound Event Payload

```json
{
  "event_no": "TODO-20260728101000-ABCDE",
  "event_type": "todo",
  "store_id": "store uuid",
  "store_name": "Taoyuan Store",
  "staff_info": {
    "staff_id": "T001",
    "name": "Technician Wang"
  },
  "work_order_id": "WO-001",
  "plate": "ABC-1234",
  "model": "Toyota Altis",
  "receiver": "Technician Wang",
  "message_template": "Tomorrow work reminder",
  "content_params": {
    "message": "Tomorrow 09:00 work order for ABC-1234"
  },
  "callback_webhook_url": "https://car-shop-manage.vercel.app/api/n8n/callback"
}
```

## Callback Payload From N8N

```json
{
  "event_no": "TODO-20260728101000-ABCDE",
  "event_type": "todo",
  "send_status": "success",
  "receiver": "Technician Wang Telegram",
  "message_content": "Tomorrow 09:00 work order for ABC-1234",
  "error_note": "",
  "n8n_execution_id": "12345"
}
```

## Telegram Next Step

Recommended N8N structure:

1. Webhook trigger receives system event JSON.
2. Switch node checks `event_type`.
3. Code node formats Telegram message text.
4. Telegram node sends to target `chat_id`.
5. HTTP Request node posts result back to `/api/n8n/callback`.

Do not put Telegram bot tokens in frontend code. Store Telegram credentials in N8N credentials or environment variables.
