# آماده‌سازی و بررسی ادغام POS — ۲۰۲۶/۱۱/۰۴

## مبنا و محدوده

تغییرات پس از از‌دست‌رفتن checkout موقت قبلی روی یک clone مستقل و برنچ `prepare/pos-production-sales-v2` بازسازی شدند. این Commit جدید جایگزین Commit محلی قبلی 98817c1 است و همان Commit نیست.
مبنا `main` با SHA برابر `343b6443389ef4921de7a1ce3eab141f50f4c1c1` است. اصلاح OTP با `updatePipeline: true` کاملاً حفظ شده است.

کاربر پس از درخواست آماده‌سازی محلی، صریحاً اجازه داد در صورت تأیید تست‌ها تغییرات در main پوش شوند. Workflow موجود Deploy Production با Push به main شروع می‌شود؛ این رفتار پیش از انتشار به کاربر اعلام شد. هیچ Workflow انتشار یا متغیر VPS در این تغییر عوض نشده است.

## بازبینی و تغییرات

۱۰ فایل درخواست اولیه، مدیریت دستگاه تکی، auth، Product hooks و Outbox بازبینی شدند. POST sales، منطق atomic transaction، کسر موجودی و idempotency از ابتدا بازنویسی نشده‌اند. ساخت دستگاه، نمایش یک‌باره Token، rotation، deactivate، lastSeenAt و مجوز superadmin موجود و حفظ شده‌اند.

| فایل | تغییر |
| --- | --- |
| app/api/pos/v1/sales/[saleId]/route.ts | GET با Scope sales، فیلتر ترکیبی دستگاه و saleId، projection امن |
| lib/pos/sales-lookup-core.ts | اعتبارسنجی و پاسخ‌های استاندارد no-store، مستقل از gate ارسال |
| lib/pos/sales-contract.ts | الگوی مشترک saleId و رد newline انتهایی |
| lib/pos/catalog-repository.ts | import صریح Category برای Cold Start |
| app/(dashboard)/dashboard/pos-sales/page.tsx | مشاهده فقط‌خواندنی فاکتورها و گردش موجودی، superadmin، ۲۰ فاکتور و فیلتر وضعیت |
| app/(dashboard)/dashboard/components/DashboardSidebar.tsx | لینک فروش‌های صندوق |
| pos-sales-lookup.test.mjs | امنیت و رفتار GET و خطاهای احراز هویت/خواندن |
| pos-sales-transaction.test.mjs | Replica Set موقت واقعی با داده‌های ساختگی |
| scripts/pos-test-loader.mjs | resolve aliasهای Next در تست Node |
| package.json و package-lock.json | وابستگی توسعه تست، فرمان اجرا و غیرفعال‌سازی دانلود binary هنگام install |
| docs/pos-integration/README.md | قرارداد GET، Timeout/Retry، دستگاه و اجرای تست |
| docs/pos-integration/production-preparation-report.md | این گزارش |

## اعتبارسنجی

- تمام Regressionها همراه Replica Set محلی: **۱۵۶ PASS، صفر FAIL و صفر SKIP**.
- تست‌ها شامل single، Variant مشخص، چندمحصولی، Replay، saleId با payload متفاوت، کمبود موجودی، rollback پس از write محصول/Outbox/Sale، اختلاف قیمت، تأخیر آفلاین و درخواست‌های هم‌زمان هستند.
- Snapshot نخست در Process تازه Category را populate می‌کند؛ Changes موجودی کاهش‌یافته را برمی‌گرداند.
- مسیر واقعی GET روی دیتابیس ساختگی: 200/400/401/403/404، دستگاه دیگر، دستگاه غیرفعال، no-store، DTO حداقلی، gate ارسال خاموش و ثابت‌ماندن فروش/موجودی/Outbox. تست واحد 429/500/503 را نیز بررسی می‌کند.
- `npm run build` و `npx tsc --noEmit` هر دو موفق شدند. هشدار قدیمی img در Footer خارج از محدوده این تغییر است.
- پیش از Commit، origin/main دوباره fetch شد و همچنان روی 343b644 بود؛ تغییرات مستقیماً بر پایه آن ساخته شده‌اند و اصلاح OTP هیچ diff ندارد.
- بررسی بصری صفحه با نشست واقعی superadmin انجام نشده است؛ اعتبارسنجی سروری و Build جایگزین ادعای بررسی بصری نیست.

## قرارداد GET

`GET /api/pos/v1/sales/<saleId>` با هدر دستگاه و Bearer Token و Scope sales.
پاسخ 200 شامل `apiVersion: v1`، `registrationStatus: registered` و sale با saleId، siteSaleId، invoiceNumber، soldAtUtc، syncedAtUtc، finalAmountToman، syncStatus و reviewReasons است. customer، token، requestHash و reference پرداخت افشا نمی‌شوند.
404 پس از Timeout شکست قطعی POST نیست. Retry باید با backoff و jitter انجام شود و POST مجدد همان دستگاه، saleId و payload پایدار را نگه دارد. review_required نیز ثبت موفق با کاهش موجودی است.

## موارد عملیاتی تأییدنشده و اقدامات باقی‌مانده

| مورد | وضعیت |
| --- | --- |
| قرارداد POST فعلی و Transaction/Outbox در تست محلی | VERIFIED؛ قرارداد POST تغییر نکرده است |
| اجرای نسخه فعلی WPF، صف آفلاین و سیاست Retry | NOT VERIFIED؛ سورس و اجرای WPF در checkout حاضر نیست |
| مدل‌ها و indexهای تعریف‌شده در کد | VERIFIED روی Replica Set محلی؛ شامل یکتایی deviceId+saleId و posSale+itemIndex |
| وجود واقعی indexها، سلامت داده قدیمی و تنظیمات Transaction Production | NOT VERIFIED |
| مقادیر VPS شامل POS_SALES_ENABLED و POS_TOKEN_PEPPER | NOT VERIFIED؛ خوانده یا تغییر داده نشدند |
| دستگاه مستقل واقعی با Scope کافی | NOT VERIFIED؛ دستگاه واقعی ساخته یا تغییر داده نشد |
| Backup فعلی معتبر با بازیابی آزمایشی | NOT VERIFIED |
| اصلاح فروش اشتباه و Refund | پیاده‌سازی نشده؛ گردش جبرانی حسابرسی‌پذیر پیش از استفاده روزمره لازم است |

پیش از اولین فروش واقعی: Backup جدید و restore در دیتابیس جدا، audit فقط‌خواندنی کاتالوگ، indexهای یکتا و پشتیبانی Transaction بررسی شوند. هیچ syncIndexes/migration نوشتنی اجرا نشده است.
superadmin در صورت نیاز دستگاه مستقل با catalog و sales بسازد و Token یک‌بارنمایش را مستقیم در secret storage صندوق نگه دارد. pepper موجود عوض نشود. راهنمای دقیق در README است.
WPF با HTTPS عمومی، integer Toman و شناسه canonical تنظیم و Snapshot/Changes/GET و Retry آن بررسی شود. اگر ارسال خاموش است، فعال‌سازی POS_SALES_ENABLED=true فقط پس از تأیید آمادگی عملیاتی انجام شود؛ GET نیازی به این فعال‌سازی ندارد.
اولین فروش واقعی فقط با تأیید مشخص انجام و رسید، موجودی Parent/Variant، inventoryVersion، Movement و Changes تطبیق داده شوند. Replay نباید کسر دوم ایجاد کند. هیچ POST واقعی یا تغییر مستقیم موجودی/داده Production در این کار اجرا نشده است.
