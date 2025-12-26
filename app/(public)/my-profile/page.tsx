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
    <div className="md:container mx-auto sm:mx-2 my-5">
      <div className="flex gap-5">
        <Sidebar />
        <div className="flex flex-col w-full ">
          <Stepper activeStep={activeStep} />

          {activeStep === 1 && <Profile />}
          {activeStep === 2 && <FavoritesPage />}
          {activeStep === 3 && <MyAddresses />}
          {activeStep === 4 && <MyComments />}
          {activeStep === 5 && <MyOrders />}
        </div>
      </div>
    </div>
  );
}
