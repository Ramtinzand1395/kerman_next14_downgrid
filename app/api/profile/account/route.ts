import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import moment from "moment-jalaali";
import dbConnect from "@/lib/mongodb"; // تابع اتصال به MongoDB
import User from "@/model/User";

function enToFaNumbers(str: string): string {
  const enNumbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const faNumbers = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return str.replace(/[0-9]/g, (w) => faNumbers[enNumbers.indexOf(w)]);
}

function faToEnNumbers(str: string): string {
  const faNumbers = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  const enNumbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return str.replace(/[۰-۹]/g, (w) => enNumbers[faNumbers.indexOf(w)]);
}
export async function GET() {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.mobile) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
    }
    // todo اضافه کردن مدل ها و این خط
    const user = await User.findOne({ mobile: session.user.mobile });
    // .populate(
    //   "favorites addresses orders products comments tempPayments"
    // );

    if (!user) {
      return NextResponse.json(
        { error: "کاربری با این شماره موبایل یافت نشد" },
        { status: 404 }
      );
    }
    // تبدیل تاریخ میلادی به شمسی با اعداد فارسی
    let birthdayJalali = null;
    if (user.birthday) {
      const jalali = moment(user.birthday).format("jYYYY-jMM-jDD");
      birthdayJalali = enToFaNumbers(jalali);
    }

    return NextResponse.json({
      ...user.toObject(),
      birthday: birthdayJalali,
    });
  } catch (err) {
    console.error("خطا در دریافت کاربر:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session?.user?.mobile) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
    }

    const data = await req.json();

    // تبدیل تاریخ شمسی به میلادی
    let birthdayGregorian = null;
    if (data.birthday) {
      const birthdayEn = faToEnNumbers(data.birthday); // تبدیل اعداد فارسی به انگلیسی
      birthdayGregorian = moment(birthdayEn, "jYYYY-jMM-jDD").format(
        "YYYY-MM-DD"
      );
    }

    const updatedUser = await User.findOneAndUpdate(
      { mobile: session.user.mobile },
      {
        username: data.username,
        email: data.email,
        gender: data.gender,
        birthday: birthdayGregorian,
        nationalCode: data.nationalCode,
        newsletter: data.newsletter,
      },
      { new: true } // بازگرداندن نسخه بروز شده
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("خطا در بروزرسانی کاربر:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// !قبل از اضافه کردن جلالی

// export async function PUT(req: NextRequest) {
//   try {
//     await dbConnect();

//     const session = await getServerSession(authOptions);
//     if (!session?.user?.mobile) {
//       return NextResponse.json({ error:  "کاربر وارد نشده"}, { status: 401 });
//     }

//     const data = await req.json();

//     const updatedUser = await User.findOneAndUpdate(
//       { mobile: session.user.mobile },
//       {
//         username: data.username,
//         email: data.email,
//         gender: data.gender,
//         birthday: data.birthday,
//         nationalCode: data.nationalCode,
//       },
//       { new: true } // بازگرداندن نسخه بروز شده
//     );

//     if (!updatedUser) {
//       return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, user: updatedUser });
//   } catch (error) {
//     console.error("خطا در بروزرسانی کاربر:", error);
//     return NextResponse.json({ error: "Server error" }, { status: 500 });
//   }
// }

// export async function GET() {
//   try {
//     await dbConnect();

//     const session = await getServerSession(authOptions);
//     if (!session?.user?.mobile) {
//       return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
//     }
//     // todo اضافه کردن مدل ها و این خط
//     const user = await User.findOne({ mobile: session.user.mobile });
//     // .populate(
//     //   "favorites addresses orders products comments tempPayments"
//     // );

//     if (!user) {
//       return NextResponse.json(
//         { error: "کاربری با این شماره موبایل یافت نشد" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(user);
//   } catch (err) {
//     console.error("خطا در دریافت کاربر:", err);
//     return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
//   }
// }
