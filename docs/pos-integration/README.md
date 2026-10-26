# Kerman POS integration foundation (v1)

این سند قرارداد فعلی زیرساخت امن، کاتالوگ و ثبت تراکنشی فروش حضوری POS را شرح می‌دهد. Refund هنوز در این نسخه پیاده‌سازی نشده است.

## ثبت فروش حضوری

`POST /api/pos/v1/sales` فقط برای دستگاه فعال دارای scope `sales` قابل استفاده است. `deviceId` فقط از احراز هویت ماشین‌به‌ماشین خوانده می‌شود و مقدار ادعایی داخل body اعتباری ندارد. هر فروش با `(deviceId, saleId)` یکتا است:

- بار اول پاسخ `201` و `replayed: false` می‌گیرد.
- تکرار دقیق همان payload پاسخ `200`، همان `siteSaleId` و `replayed: true` می‌گیرد و موجودی دوباره کم نمی‌شود.
- استفاده از همان کلید با محتوای متفاوت پاسخ `409 POS_SALE_IDEMPOTENCY_CONFLICT` می‌گیرد.
- کمبود موجودی یا رقابت روی آخرین موجودی پاسخ `409 POS_SALE_INVENTORY_CONFLICT` همراه موجودی قابل دسترس می‌گیرد.

کسر موجودی Product/Variant، افزایش `inventoryVersion`، ثبت `PosSale`، ثبت یک `PosInventoryMovement` برای هر ردیف و رویداد Outbox کاتالوگ در یک MongoDB transaction با majority write concern انجام می‌شود. فروش چندکالایی یا کامل Commit می‌شود یا کامل Rollback می‌شود. مدل‌های `Order` و `StoreOrder` تغییر نکرده‌اند.

قیمت مرجع از Product یا Variant فعلی سایت خوانده و در `priceSnapshot` نگهداری می‌شود. `unitPriceToman` و `discountToman` ادعایی POS نیز جداگانه ذخیره می‌شوند. اختلاف قیمت باعث تغییر قیمت مرجع سایت نمی‌شود؛ فروش با `syncStatus: "review_required"` و reason برابر `price_mismatch` ثبت می‌شود. فروش دیرهنگام آفلاین نیز reason برابر `offline_delay` می‌گیرد. آستانه پیش‌فرض ۱۵ دقیقه و با `POS_OFFLINE_SALE_REVIEW_AFTER_MINUTES` قابل تنظیم است. اگر Product هنوز وجود داشته باشد ولی draft/soft-deleted یا Variant غیرفعال باشد، فروشِ دارای موجودی با `catalog_state` برای بررسی ثبت می‌شود؛ شناسه گمشده یا موجودی ناکافی رد می‌شود.

نمونه درخواست:

```json
{
  "saleId": "counter-1-20261026-000042",
  "soldAtUtc": "2026-10-26T10:30:00.000Z",
  "items": [
    {
      "productId": "66f123456789abcdef123450",
      "variantId": "66f123456789abcdef123451",
      "quantity": 1,
      "unitPriceToman": 35000000,
      "discountToman": 1000000
    }
  ],
  "finalAmountToman": 34000000,
  "paymentMethods": [
    { "method": "card", "amountToman": 34000000, "reference": "terminal-123" }
  ],
  "customer": { "customerId": null, "name": "مشتری حضوری", "mobile": null },
  "cashier": { "cashierId": "cashier-7", "name": "صندوقدار" }
}
```

همه قیمت‌ها integer Toman و همه quantityها integer مثبت هستند. جمع مبلغ روش‌های پرداخت، جمع نهایی ردیف‌ها و `finalAmountToman` باید دقیقاً برابر باشد.

تست دستی PowerShell:

```powershell
$headers = @{
  Authorization = "Bearer $env:POS_TEST_TOKEN"
  "X-POS-Device-ID" = $env:POS_TEST_DEVICE_ID
  "Content-Type" = "application/json"
}

$saleId = "manual-$([Guid]::NewGuid().ToString('N'))"
$body = @{
  saleId = $saleId
  soldAtUtc = (Get-Date).ToUniversalTime().ToString("o")
  items = @(@{
    productId = $env:POS_TEST_PRODUCT_ID
    variantId = $null
    quantity = 1
    unitPriceToman = 1000000
    discountToman = 0
  })
  finalAmountToman = 1000000
  paymentMethods = @(@{ method = "card"; amountToman = 1000000; reference = "manual-test" })
  customer = $null
  cashier = @{ cashierId = "manual"; name = "Manual Test" }
} | ConvertTo-Json -Depth 8

$first = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/pos/v1/sales" -Headers $headers -Body $body
$replay = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/pos/v1/sales" -Headers $headers -Body $body
$first.sale.siteSaleId -eq $replay.sale.siteSaleId
$replay.replayed
```

## Catalog snapshot

`GET /api/pos/v1/catalog/snapshot` فقط برای دستگاه فعال دارای scope `catalog` در دسترس است. فقط محصولات `published` و حذف‌نشده در snapshot هستند. Variantهای غیرفعال داخل محصول multi با `isActive: false` حفظ می‌شوند تا POS بتواند آن هویت را غیرفعال کند.

پارامتر `limit` عدد صحیح بین 1 و 200 است و مقدار پیش‌فرض 100 دارد. `nextCursor` یک cursor opaque است و نباید در client ساخته یا ویرایش شود. صفحه بعد با همان `limit` و `cursor` پاسخ قبلی درخواست می‌شود.

`productId` و `variantId` شناسه‌های canonical همگام‌سازی هستند. SKU و Barcode برای lookup عملیاتی‌اند، nullable باقی می‌مانند و به‌صورت case-insensitive برای writeهای جدید بررسی می‌شوند. Barcode سطح Product فقط برای محصول single است؛ محصول multi از `variants[].barcode` استفاده می‌کند.

فیلد top-level به نام `syncCursor` در پاسخ snapshot، مرز پایدار شروع Incremental Sync است. در snapshot چندصفحه‌ای، Cursor اولین صفحه را نگه دارید؛ تغییراتی که هم‌زمان با دریافت صفحه‌ها Commit شوند sequence بزرگ‌تری دارند و بعداً از endpoint تغییرات دریافت می‌شوند.

برای multi، قیمت خلاصه محصول از default variant فعال (یا نخستین variant فعال) و موجودی مرکزی از مجموع stock Variantهای فعال محاسبه می‌شود. قیمت و موجودی قابل فروش هر Variant همیشه از خود Variant می‌آید، نه از کمینه Parent.

نمونه پاسخ:

```json
{
  "apiVersion": "v1",
  "syncCursor": "opaque-outbox-cursor",
  "items": [
    {
      "productId": "66f123456789abcdef123450",
      "name": "کنسول پلی‌استیشن 5",
      "slug": "playstation-5",
      "sku": "PS5-FAMILY",
      "barcode": null,
      "productType": "multi",
      "category": {
        "categoryId": "66f123456789abcdef123499",
        "name": "کنسول بازی",
        "slug": "game-console"
      },
      "imageUrl": "https://cdn.example.com/ps5.jpg",
      "status": "published",
      "basePriceToman": 35000000,
      "discountedPriceToman": 34000000,
      "centralStock": 7,
      "variants": [
        {
          "variantId": "66f123456789abcdef123451",
          "name": "استاندارد",
          "sku": "PS5-STD",
          "barcode": "626000000001",
          "basePriceToman": 35000000,
          "discountedPriceToman": 34000000,
          "stock": 7,
          "isActive": true,
          "attributes": [
            {
              "groupId": "edition",
              "key": "edition",
              "label": "نسخه",
              "optionId": "standard",
              "optionLabel": "استاندارد"
            }
          ]
        }
      ],
      "catalogRevision": 12,
      "inventoryVersion": 8,
      "siteCreatedAtUtc": "2026-01-01T10:00:00.000Z",
      "siteUpdatedAtUtc": "2026-10-25T10:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "hasMore": true,
    "nextCursor": "opaque-cursor-from-server"
  }
}
```

## Incremental catalog changes

`GET /api/pos/v1/catalog/changes` فقط برای دستگاه فعال دارای scope `catalog` است. رویدادها در MongoDB ذخیره می‌شوند و با Restart یا scale-to-zero شدن Function از بین نمی‌روند. ترتیب فقط بر اساس sequence افزایشی Outbox است و Timestamp در Cursor نقشی ندارد.

نمونه پاسخ:

```json
{
  "apiVersion": "v1",
  "items": [
    {
      "sequence": 42,
      "eventId": "66f123456789abcdef123460",
      "productId": "66f123456789abcdef123450",
      "eventType": "updated",
      "changes": ["price", "inventory"],
      "action": "upsert",
      "product": {
        "productId": "66f123456789abcdef123450",
        "name": "کنسول پلی‌استیشن 5",
        "slug": "playstation-5",
        "sku": "PS5-FAMILY",
        "barcode": null,
        "productType": "multi",
        "category": null,
        "imageUrl": "https://cdn.example.com/ps5.jpg",
        "status": "published",
        "basePriceToman": 35000000,
        "discountedPriceToman": 34000000,
        "centralStock": 6,
        "variants": [],
        "catalogRevision": 13,
        "inventoryVersion": 9,
        "siteCreatedAtUtc": "2026-01-01T10:00:00.000Z",
        "siteUpdatedAtUtc": "2026-10-25T11:00:00.000Z"
      },
      "catalogRevision": 13,
      "inventoryVersion": 9,
      "occurredAtUtc": "2026-10-25T11:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "hasMore": false,
    "nextCursor": "opaque-cursor-from-server",
    "highWaterCursor": "opaque-high-water-cursor"
  }
}
```

`action: "upsert"` شامل snapshot کامل و whitelist‌شده محصول است. برای draft، غیرفعال‌سازی و soft-delete مقدار `action` برابر `remove` و `product` برابر `null` است. Cursor را opaque نگه دارید و پس از اعمال اتمیک همه آیتم‌های صفحه، فقط `nextCursor` را ذخیره کنید. درخواست دوباره با Cursor قبلی همان رویدادها را برمی‌گرداند و client باید اعمال upsert/remove را idempotent انجام دهد.

Bootstrap قابل اعتماد:

1. اولین صفحه snapshot را دریافت و `syncCursor` آن را ذخیره کنید.
2. تمام صفحه‌های snapshot را با Cursor مخصوص snapshot کامل کنید، ولی `syncCursor` اولین صفحه را عوض نکنید.
3. `changes?cursor=<syncCursor>` را تا `hasMore: false` بخوانید.
4. سپس polling بعدی را با آخرین `nextCursor` ادامه دهید.

اگر رویدادهای لازم به‌علت retention دیگر وجود نداشته باشند، API پاسخ HTTP `410` با کد `POS_CATALOG_FULL_RESYNC_REQUIRED` و `snapshotUrl` می‌دهد. در این حالت snapshot کامل را دوباره اجرا کنید. Cursor جلوتر از high-water پاسخ `400` می‌گیرد.

ثبت Product و Outbox در یک MongoDB transaction با write concern اکثریت انجام می‌شود. شکست ثبت Event باعث rollback تغییر Product می‌شود. مسیرهای خرید Zarinpal و Wallet از همان سرویس مشترک استفاده می‌کنند و کلید idempotency مانع کسر دوباره موجودی/تولید رویداد تکراری در retry می‌شود. خواندن Changes هیچ Event جدیدی تولید نمی‌کند.

تست دستی PowerShell:

```powershell
$headers = @{
  Authorization = "Bearer $env:POS_TEST_TOKEN"
  "X-POS-Device-ID" = $env:POS_TEST_DEVICE_ID
}

$page = Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:3000/api/pos/v1/catalog/snapshot?limit=200" `
  -Headers $headers

$page.items | Format-Table productId, name, productType, centralStock

if ($page.pagination.hasMore) {
  $cursor = [Uri]::EscapeDataString($page.pagination.nextCursor)
  $nextPage = Invoke-RestMethod `
    -Method Get `
    -Uri "http://localhost:3000/api/pos/v1/catalog/snapshot?limit=200&cursor=$cursor" `
    -Headers $headers
}

$syncCursor = [Uri]::EscapeDataString($page.syncCursor)
$changes = Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:3000/api/pos/v1/catalog/changes?limit=200&cursor=$syncCursor" `
  -Headers $headers
```

بررسی read-only داده‌های قدیمی (هیچ write یا پاک‌سازی انجام نمی‌دهد):

```powershell
npm run audit:pos-catalog
```

## گزارش سازگاری فعلی

- برنامه از Next.js App Router و Route Handler استفاده می‌کند و اتصال MongoDB با Mongoose انجام می‌شود.
- `Product` محصولات تک‌مدلی و چندمدلی را پشتیبانی می‌کند. مبالغ `price` و `discountPrice` و موجودی‌ها عدد صحیح امن و نامنفی هستند. `catalogRevision` در ویرایش Admin افزایش می‌یابد و `inventoryVersion` اکنون state موجودی هر Variant، شناسه Variant و وضعیت فعال بودن آن را مقایسه می‌کند؛ بنابراین جابه‌جایی موجودی بین Variantها با مجموع ثابت نیز نسخه موجودی را افزایش می‌دهد.
- `Order` سفارش سایت و snapshot اقلام، قیمت‌ها، هزینه ارسال و وضعیت پرداخت را نگه می‌دارد. `StoreOrder` مدل قدیمی و مستقل سفارش خدمات داخل فروشگاه است. بعضی فیلدهای پولی این دو مدل قدیمی فقط `Number` هستند و در سطح schema الزام safe-integer یکسان ندارند؛ بنابراین فاز تراکنشی POS باید قبل از هر write قرارداد integer Toman را در ورودی سرور enforce کند. هیچ‌یک در این مرحله تغییر نکرده‌اند.
- `User` نقش‌های `user`، `admin` و `superadmin` دارد. احراز هویت سایت با NextAuth و Session/JWT انجام می‌شود؛ endpointهای POS از این Session استفاده نمی‌کنند.
- مدیریت فعلی محصولات فقط برای `superadmin` مجاز است. endpointهای مدیریت دستگاه POS نیز همین محدودیت را دارند.
- واحد تمام قراردادهای پولی POS باید integer Toman باشد. در این مرحله هیچ فیلد پولی جدیدی ایجاد نشده است.

## قرارداد امنیتی

- پایه API: `GET /api/pos/v1`
- runtime: Node.js
- هدر توکن: `Authorization: Bearer <token>`
- هدر شناسه دستگاه: `X-POS-Device-ID: <deviceId>`
- scope لازم برای endpoint بررسی اتصال: `catalog`
- scopeهای معتبر: `catalog`, `inventory`, `sales`, `orders`, `refunds`
- توکن خام فقط یک‌بار هنگام ساخت یا rotation در پاسخ superadmin نمایش داده می‌شود. دیتابیس فقط HMAC-SHA-256 توکن را با `POS_TOKEN_PEPPER` نگه می‌دارد.
- پاسخ‌های عادی، فهرست دستگاه‌ها و logها شامل توکن خام یا hash نیستند.
- محدودسازی درخواست و تلاش ناموفق در MongoDB ثبت می‌شود و بین instanceهای serverless مشترک است.
- دستگاه غیرفعال و توکن قدیمی پس از rotation پاسخ `401` می‌گیرند؛ scope ناکافی پاسخ `403` می‌گیرد.

## متغیرهای محیطی

مقادیر زیر را در محیط محلی و Vercel تنظیم کنید. `POS_TOKEN_PEPPER` باید یک secret تصادفی با حداقل ۳۲ بایت باشد و نباید با توکن دستگاه یکسان باشد.

```text
POS_TOKEN_PEPPER=
POS_RATE_LIMIT_REQUESTS_PER_MINUTE=
POS_AUTH_FAILURE_LIMIT=
POS_AUTH_FAILURE_WINDOW_SECONDS=
POS_CATALOG_CHANGE_RETENTION_DAYS=
POS_OFFLINE_SALE_REVIEW_AFTER_MINUTES=
MONGODB_TEST_URI=
```

اگر متغیرهای عددی خالی باشند، به‌ترتیب مقادیر پیش‌فرض 120 درخواست در دقیقه، 10 تلاش ناموفق، پنجره 900 ثانیه و retention نودروزه Outbox استفاده می‌شود.

ساخت pepper تست در PowerShell:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

## ساخت دستگاه و توکن تست

این endpoint به Session مرورگر یک کاربر `superadmin` نیاز دارد و برای POS client نیست:

```http
POST /api/pos/v1/admin/devices
Content-Type: application/json

{
  "name": "Kerman Counter 1",
  "scopes": ["catalog", "sales"]
}
```

پاسخ `201` شامل `device` و فیلد `token` با علامت `tokenShownOnce: true` است. همان لحظه توکن را در secret storage برنامه دسکتاپ ذخیره کنید؛ بازیابی دوباره آن ممکن نیست.

بررسی اتصال:

```powershell
$headers = @{
  Authorization = "Bearer $env:POS_TEST_TOKEN"
  "X-POS-Device-ID" = $env:POS_TEST_DEVICE_ID
}
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/pos/v1" -Headers $headers
```

## غیرفعال‌سازی، فعال‌سازی و rotation

هر سه عملیات فقط برای superadmin و با Session سایت در دسترس‌اند:

```http
PATCH /api/pos/v1/admin/devices/<deviceId>
Content-Type: application/json

{ "action": "deactivate" }
```

مقادیر مجاز `action`: `deactivate`, `activate`, `rotate`. عملیات `rotate` توکن قبلی را بلافاصله نامعتبر می‌کند و توکن جدید را فقط در همان پاسخ برمی‌گرداند. Rotation وضعیت فعال/غیرفعال دستگاه را تغییر نمی‌دهد.

## اجرای تست‌ها در Windows PowerShell

```powershell
npm test
npx tsc --noEmit
npm run build
```

تست‌های POS شامل نبود توکن، توکن اشتباه، scope اشتباه، توکن معتبر، دستگاه غیرفعال و جلوگیری از افشای توکن در پاسخ و log است.

تست Integration فروش در حالت پیش‌فرض یک MongoDB Replica Set موقت و in-memory ایجاد می‌کند و پس از تست آن را متوقف می‌کند. برای استفاده از MongoDB آزمایشی خودتان، URI باید نام دیتابیسی شامل `test` داشته باشد و سرور باید Replica Set یا Sharded Cluster با پشتیبانی Transaction باشد. هرگز URI Production را در این متغیر قرار ندهید:

```powershell
$env:MONGODB_TEST_URI = "mongodb://127.0.0.1:27019/kerman_pos_test?replicaSet=rs0"
npm run test:pos-sales:integration
Remove-Item Env:MONGODB_TEST_URI
```

اگر `MONGODB_TEST_URI` تنظیم نشده باشد، تست از Replica Set موقت استفاده می‌کند و هیچ اتصال Production انجام نمی‌دهد.
