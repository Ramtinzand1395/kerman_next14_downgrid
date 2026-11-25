import { FileText, Grid2x2, Home, Info, Phone, Wrench } from "lucide-react";

export const navigationItems = [
  { name: "خانه", link: "/", icon: <Home className="h-4 w-4 ml-1" /> },
  { name: "دسته‌بندی‌ها", link: "/categories", icon: <Grid2x2 className="h-4 w-4 ml-1" /> },
  { name: "درباره ما", link: "/about-us", icon: <Info className="h-4 w-4 ml-1" /> },
  { name: "تماس با ما", link: "/contact-us", icon: <Phone className="h-4 w-4 ml-1" /> },
  { name: "وبلاگ", link: "/blog", icon: <FileText className="h-4 w-4 ml-1" /> },
  { name: "خدمات", link: "/services", icon: <Wrench className="h-4 w-4 ml-1" /> },
];

export const headerControlFocus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export const headerActionStyle =
  "xl:min-h-11 xl:rounded-xl xl:border xl:border-slate-200 xl:bg-white xl:px-3 xl:text-sm xl:font-semibold xl:text-slate-700 xl:hover:border-slate-300 xl:hover:bg-slate-50 xl:hover:text-blue-600";
