"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DiscountTimerProps {
  endDate: string; // تاریخ پایان به صورت ISO string
}

export default function DiscountTimer({ endDate }: DiscountTimerProps) {
  const calculateTimeLeft = () => {
    const difference = new Date(endDate).getTime() - new Date().getTime();
    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    } else {
      return null;
    }
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center p-6 bg-red-100 rounded-lg border border-red-400 text-red-700"
      >
        <h2 className="text-2xl font-bold mb-2">تخفیف تمام شد!</h2>
        <p>متاسفانه این پیشنهاد دیگر قابل استفاده نیست.</p>
      </motion.div>
    );
  }

  const timeUnits = [
    { label: "ساعت", value: timeLeft.hours, key: "hours" },
    { label: "دقیقه", value: timeLeft.minutes, key: "minutes" },
    { label: "ثانیه", value: timeLeft.seconds, key: "seconds" },
  ];

  return (
    <div className="flex items-center text-xs md:text-base">
      <span className="ml-5 text-red-800">پیشنهاد ویژه:</span>
      <AnimatePresence mode="wait">
        <motion.div
          key="timer-wrapper"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap justify-center gap-0 md:gap-4 p-2 bg-red-100 rounded-lg border border-red-400 text-red-800 font-bold text-xs md:text-base"
        >
          {timeUnits.map((unit) => (
            <motion.div
              key={unit.key + "-" + unit.value} // key یکتا
              className="px-2 bg-red-200 rounded text-xs md:text-base"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.3 }}
            >
              {unit.value} {unit.label}
            </motion.div>
          ))}
          <span className="ml-2 self-center hidden md:block md:text-base">
            باقی مانده
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
