import dbConnect from "@/lib/mongodb";
import Otp from "@/model/Otp";

export async function POST(req: Request) {
  await dbConnect();
  const { enteredOtp, otpId, mobile } = await req.json();

  if (!enteredOtp || !otpId || !mobile) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "اطلاعات لازم برای تایید OTP ناقص است",
      }),
      { status: 400 }
    );
  }

  const enteredOtpString = String(enteredOtp);
  const otpDoc = await Otp.findOne({ _id: otpId, mobile });

  if (!otpDoc) {
    return new Response(
      JSON.stringify({ success: false, message: "OTP منقضی شده یا یافت نشد" }),
      { status: 400 }
    );
  }

  if (otpDoc.otp !== enteredOtpString) {
    return new Response(
      JSON.stringify({ success: false, message: "OTP اشتباه است" }),
      { status: 400 }
    );
  }

  // یکبار مصرف: پاک کردن OTP
  await otpDoc.deleteOne();

  return new Response(
    JSON.stringify({ success: true, message: "OTP صحیح است" }),
    { status: 200 }
  );
}
