# Kerman POS integration foundation (v1)

این مرحله فقط زیرساخت امن اتصال POS را اضافه می‌کند. هیچ endpoint فروش، تغییر موجودی، ثبت سفارش یا بازپرداخت در این مرحله وجود ندارد.

## Catalog snapshot

`GET /api/pos/v1/catalog/snapshot` فقط برای دستگاه فعال دارای scope `catalog` در دسترس است. فقط محصولات `published` و حذف‌نشده در snapshot هستند. Variantهای غیرفعال داخل محصول multi با `isActive: false` حفظ می‌شوند تا POS بتواند آن هویت را غیرفعال کند.

پارامتر `limit` عدد صحیح بین 1 و 200 است و مقدار پیش‌فرض 100 دارد. `nextCursor` یک cursor opaque است و نباید در client ساخته یا ویرایش شود. صفحه بعد با همان `limit` و `cursor` پاسخ قبلی درخواست می‌شود.

`productId` و `variantId` شناسه‌های canonical همگام‌سازی هستند. SKU و Barcode برای lookup عملیاتی‌اند، nullable باقی می‌مانند و به‌صورت case-insensitive برای writeهای جدید بررسی می‌شوند. Barcode سطح Product فقط برای محصول single است؛ محصول multi از `variants[].barcode` استفاده می‌کند.

برای multi، قیمت خلاصه محصول از default variant فعال (یا نخستین variant فعال) و موجودی مرکزی از مجموع stock Variantهای فعال محاسبه می‌شود. قیمت و موجودی قابل فروش هر Variant همیشه از خود Variant می‌آید، نه از کمینه Parent.

نمونه پاسخ:

```json
{
  "apiVersion": "v1",
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
```

بررسی read-only داده‌های قدیمی (هیچ write یا پاک‌سازی انجام نمی‌دهد):

```powershell
npm run audit:pos-catalog
```

## گزارش سازگاری فعلی

- برنامه از Next.js App Router و Route Handler استفاده می‌کند و اتصال MongoDB با Mongoose انجام می‌شود.
- `Product` محصولات تک‌مدلی و چندمدلی را پشتیبانی می‌کند. مبالغ `price` و `discountPrice` و موجودی‌ها عدد صحیح امن و نامنفی هستند. `catalogRevision` و `inventoryVersion` در مدل وجود دارند؛ مدیریت فعلی محصول `catalogRevision` را در هر ویرایش افزایش می‌دهد، اما افزایش `inventoryVersion` فقط با مقایسه `Product.stock` تجمیعی انجام می‌شود. بنابراین جابه‌جایی موجودی بین variantها با مجموع ثابت ممکن است نسخه موجودی را تغییر ندهد و باید پیش از فعال‌سازی sync موجودی POS اصلاح شود.
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
```

اگر متغیرهای عددی خالی باشند، به‌ترتیب مقادیر پیش‌فرض 120 درخواست در دقیقه، 10 تلاش ناموفق و پنجره 900 ثانیه استفاده می‌شود.

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
  "scopes": ["catalog"]
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
