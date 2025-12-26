"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSwiper } from "swiper/react";

const Nextbtn = () => {
  const swiper = useSwiper();

  return (
    <div className=" text-white ">
      <div className=" absolute bottom-0 right-0  z-10">
        <button
          className="bg-gray-400 rounded-md p-1 cursor-pointer hover:bg-gray-600 transition-colors duration-150"
          title="nextBtn"
          onClick={() => swiper.slideNext()}
        >
          <ChevronRight />
        </button>
      </div>
      <div className=" absolute bottom-0 left-0  z-10">
        <button
          className="bg-gray-400 rounded-md p-1 cursor-pointer hover:bg-gray-600 transition-colors duration-150"
          title="preBtn"
          onClick={() => swiper.slidePrev()}
        >
          <ChevronLeft />
        </button>
      </div>
    </div>
  );
};

export default Nextbtn;
