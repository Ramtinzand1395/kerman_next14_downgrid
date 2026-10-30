# قرارداد ارسال سفارش و Kerman POS

تمام مبالغ این قرارداد عدد صحیح «تومان» هستند. تنها مبلغ ارسال‌شده به زرین‌پال در مرز درگاه، یک بار در ۱۰ ضرب و به ریال تبدیل می‌شود.

روش `kerman_local` با عنوان «ارسال به شهرستان کرمان» روش پایه و همیشه‌فعال برای محدوده تنظیم‌شده کرمان است. هزینه آن از `localDelivery.feeToman` خوانده می‌شود (پیش‌فرض ۱۵۰٬۰۰۰ تومان) و تنظیم قدیمی `enabled: false` نمی‌تواند این گزینه را از Checkout حذف کند.

## فیلدهای سازگار با نسخه‌های قبلی

- `totalPrice`: جمع مبلغ کالاها پس از تخفیف خود کالاها و پیش از کوپن و ارسال.
- `couponDiscount`: تخفیف کوپن.
- `shippingCost`: هزینه ارسال آنلاین؛ برای پس‌کرایه `null` است، نه صفر.
- `shippingPaymentType`: مقدار قدیمی `PREPAID` یا `COLLECT` برای سازگاری.
- `finalPrice`: مبلغ کل قابل پرداخت در سایت. برای ارسال شهری شامل هزینه ارسال است؛ برای پس‌کرایه شامل کرایه حمل نیست.

## snapshot جدید ارسال

```ts
shipping: {
  method: "kerman_local" | "national_collect" | "tipax" | "post_pishtaz";
  title: string;
  feeToman: number | null;
  paymentTiming: "online" | "on_delivery";
  feeStatus: "fixed" | "pending_carrier";
  destinationCity: string;
  addressSnapshot: object;
  trackingCode?: string | null;
}
```

در `national_collect`، `tipax` و `post_pishtaz` تا زمانی که اتصال نرخ معتبر وجود ندارد، مقدار `feeToman` همیشه `null`، زمان پرداخت `on_delivery` و وضعیت هزینه `pending_carrier` است. POS نباید برای این روش‌ها عدد صفر را به معنی ارسال رایگان نمایش دهد. عنوان روش و snapshot آدرس در زمان پرداخت ثابت می‌ماند و `trackingCode` بعداً توسط مدیر قابل ثبت است.

## خروجی افزوده API مدیریت سفارش

`GET /api/admin/order` بدون حذف فیلدهای قبلی، شیء زیر را نیز برمی‌گرداند:

```ts
financials: {
  itemsSubtotalToman: number;
  couponDiscountToman: number;
  shippingFeeToman: number | null;
  onlinePaymentAmountToman: number;
  shippingIncludedInOnlinePayment: boolean;
}
```

POS باید `onlinePaymentAmountToman` را مبلغ پرداخت‌شده/قابل پرداخت سایت بداند و `shippingFeeToman` را دوباره به آن اضافه نکند. تفکیک هزینه ارسال فقط برای نمایش و گزارش‌گیری است.

## ورودی Checkout

Client فقط `shippingMethod` را همراه `addressId` می‌فرستد. مبلغ ارسال ارسالی از Client پذیرفته نمی‌شود؛ سرور آدرس متعلق به کاربر، محدوده، فعال بودن روش و نرخ ذخیره‌شده در تنظیمات را دوباره اعتبارسنجی و محاسبه می‌کند.
