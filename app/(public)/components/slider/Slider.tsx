"use client";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import Nextbtn from "./Nextbtn";
import { Product } from "@/types";
import Cart from "../Cart";

interface SliderProps {
  games: Product[];
}
const Slider = ({ games }: SliderProps) => {
  return (
    <div>
      <Swiper
        freeMode={true}
        loop={true}
        slidesPerView={4}
        dir="rtl"
        autoplay={{
          delay: 2000,
        }}
        breakpoints={{
          "@0.00": {
            slidesPerView: 2,
            spaceBetween: 15,
          },
          "@0.75": {
            slidesPerView: 3,
            spaceBetween: 10,
          },
          "@1.00": {
            slidesPerView: 4,
            spaceBetween: 15,
          },
          "@1.50": {
            slidesPerView: 5,
            spaceBetween: 30,
          },
        }}
      >
        <Nextbtn />

        {games.map((item) => (
          <SwiperSlide key={item.sku}>
            <Cart game={item} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default Slider;
