"use client";

import { motion, useAnimation, useInView } from "framer-motion";
import React, { useEffect, useMemo, useRef } from "react";

type MotionDirection = "up" | "down" | "left" | "right";

interface MotionProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: MotionDirection;
  distance?: number;
  className?: string;
}

const Motion: React.FC<MotionProps> = ({
  children,
  delay = 0,
  duration = 0.65,
  direction = "up",
  distance = 48,
  className,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const isInView = useInView(ref, {
    once: true,
    margin: "-12% 0px -12% 0px",
  });

  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [controls, isInView]);

  const hiddenState = useMemo(() => {
    switch (direction) {
      case "left":
        return {
          opacity: 0,
          x: distance,
          y: 0,
          scale: 0.98,
          filter: "blur(6px)",
        };
      case "right":
        return {
          opacity: 0,
          x: -distance,
          y: 0,
          scale: 0.98,
          filter: "blur(6px)",
        };
      case "down":
        return {
          opacity: 0,
          x: 0,
          y: -distance,
          scale: 0.98,
          filter: "blur(6px)",
        };
      case "up":
      default:
        return {
          opacity: 0,
          x: 0,
          y: distance,
          scale: 0.98,
          filter: "blur(6px)",
        };
    }
  }, [direction, distance]);

  return (
    <div ref={ref} className={className}>
      <motion.div
        variants={{
          hidden: hiddenState,
          visible: {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
          },
        }}
        initial="hidden"
        animate={controls}
        transition={{
          duration,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default Motion;
