export type WizardField = "serviceType" | "device" | "installationType" | "repairIssue" | "description" | "selectedGames" | "fulfillment" | "addressId" | "selectedDate" | "time";
export type WizardIssue = { field: WizardField; step: 1 | 2 | 3 | 4 | 5; message: string };

export function normalizeAppointmentPhone(value: string) {
  return value.replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[\s()-]/g, "");
}

export function validateAppointmentWizard(input: {
  serviceType: string | null; device: string; installationType: string; repairIssue: string;
  description: string; gameCount: number; fulfillment: string | null;
  hasAddress: boolean; previewLoading: boolean; previewEligible: boolean; previewError: string;
  selectedDate: string; hasTime: boolean; timeLoading: boolean; timeError: string;
}): WizardIssue[] {
  const issues: WizardIssue[] = [];
  const add = (field: WizardField, step: WizardIssue["step"], message: string) => issues.push({ field, step, message });
  if (!input.serviceType) add("serviceType", 1, "نوع خدمت را انتخاب کنید.");
  if (!input.device) add("device", 1, "دستگاه را انتخاب کنید.");
  if (input.serviceType === "game_install" && input.device !== "xbox" && !input.installationType) add("installationType", 1, "نوع نصب بازی را انتخاب کنید.");
  if (input.serviceType === "repair" && !input.repairIssue) add("repairIssue", 1, "مشکل دستگاه را انتخاب کنید.");
  if (input.serviceType === "repair" && input.repairIssue === "other" && !input.description.trim()) add("description", 1, "برای گزینه «سایر»، مشکل دستگاه را توضیح دهید.");
  if (input.description.trim().length > 1000) add("description", 1, "توضیحات باید حداکثر ۱۰۰۰ نویسه باشد.");
  if (input.serviceType === "game_install" && !input.gameCount) add("selectedGames", 2, "حداقل یک بازی انتخاب کنید.");
  if (input.gameCount > 100) add("selectedGames", 2, "حداکثر ۱۰۰ بازی می‌توانید انتخاب کنید.");
  if (!input.fulfillment) add("fulfillment", 3, "روش دریافت خدمات را انتخاب کنید.");
  if (input.fulfillment === "courier") {
    if (!input.hasAddress) add("addressId", 4, "آدرس دریافت دستگاه را انتخاب یا ثبت کنید.");
    else if (input.previewLoading) add("addressId", 4, "بررسی محدوده و هزینه پیک هنوز تمام نشده است؛ کمی صبر کنید.");
    else if (!input.previewEligible) add("addressId", 4, input.previewError || "این آدرس برای پیک تأیید نشده است؛ آدرس دیگری انتخاب کنید.");
  }
  if (!input.selectedDate) add("selectedDate", 4, "روز مراجعه یا دریافت دستگاه را انتخاب کنید.");
  else if (!input.hasTime) add("time", 4, input.timeLoading ? "ظرفیت این روز در حال دریافت است؛ کمی صبر کنید." : input.timeError || "یک ساعت یا بازه زمانی آزاد انتخاب کنید.");
  return issues;
}
