import Sidebar from "./Sidebar";
import Stepper from "./Stepper";
import Profile from "./Profile";
import FavoritesPage from "./Favorites";
import MyAddresses from "./MyAddresses";
import MyComments from "./MyComments";
import MyOrders from "./MyOrders";

interface MyProfilePageProps {
  searchParams?: { step?: string };
}

export default async function MyProfile({ searchParams }: MyProfilePageProps) {
  const data = await searchParams;
  const activeStep = Number(data?.step ?? 1);

  return (
    <div className="container mx-auto px-3 md:px-6 py-6 md:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 md:gap-6">
        <Sidebar />

        <section className="space-y-4 md:space-y-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3 md:p-5 shadow-sm">
            <Stepper activeStep={activeStep} />
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-3 md:p-5 shadow-sm min-h-[520px]">
            {activeStep === 1 && <Profile />}
            {activeStep === 2 && <FavoritesPage />}
            {activeStep === 3 && <MyAddresses />}
            {activeStep === 4 && <MyComments />}
            {activeStep === 5 && <MyOrders />}
          </div>
        </section>
      </div>
    </div>
  );
}
