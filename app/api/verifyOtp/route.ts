import dbConnect from "@/lib/mongodb";
import Otp from "@/model/Otp";

export async function POST(req: Request) {
  await dbConnect();
  const { enteredOtp } = await req.json();

  const otpDoc = await Otp.findOne({ otp: enteredOtp });

  if (!otpDoc) {
    return new Response(
      JSON.stringify({ success: false, message: "OTP منقضی شده یا یافت نشد" }),
      { status: 400 }
    );
  }

  if (otpDoc.otp !== enteredOtp) {
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
