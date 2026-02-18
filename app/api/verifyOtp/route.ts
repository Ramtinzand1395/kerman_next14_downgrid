import dbConnect from "@/lib/mongodb";
import Otp from "@/model/Otp";

export async function POST(req: Request) {
  await dbConnect();
  const { otpId, enteredOtp, mobile } = await req.json();

  if (!otpId || !enteredOtp || !mobile) {
    return new Response(
      JSON.stringify({ success: false, message: "اطلاعات تایید ناقص است" }),
      { status: 400 },
    );
  }
  const otpDoc = await Otp.findOne({ _id: otpId, mobile, otp: enteredOtp });

  if (!otpDoc) {
    return new Response(
      JSON.stringify({ success: false, message: "OTP منقضی شده یا یافت نشد" }),
      { status: 400 },
    );
  }

  // یکبار مصرف: پاک کردن OTP
  await otpDoc.deleteOne();

  return new Response(
    JSON.stringify({ success: true, message: "OTP صحیح است" }),
    { status: 200 },
  );
}
