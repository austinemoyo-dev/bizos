export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

export const staggerChildren = {
  animate: { transition: { staggerChildren: 0.06 } },
};

export const slideRight = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
  exit:    { x: '100%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export const slideUp = {
  initial: { opacity: 0, y: '100%' },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: '100%', transition: { duration: 0.2 } },
};

/* Scroll-driven entrance — use with whileInView on motion.div */
export const scrollFadeUp = {
  initial:     { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport:    { once: true, margin: '-48px' },
  transition:  { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
};

export const scrollFadeIn = {
  initial:     { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport:    { once: true, margin: '-32px' },
  transition:  { duration: 0.28, ease: 'easeOut' },
};

export const scrollScaleUp = {
  initial:     { opacity: 0, scale: 0.96, y: 16 },
  whileInView: { opacity: 1, scale: 1, y: 0 },
  viewport:    { once: true, margin: '-40px' },
  transition:  { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
};

/* Stagger container for scroll-reveal groups */
export const scrollStagger = {
  whileInView: { transition: { staggerChildren: 0.07 } },
  viewport:    { once: true },
};

/* Child variant used inside scrollStagger */
export const scrollStaggerChild = {
  initial:  { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16,1,0.3,1] } },
};

/* Number pop — for countup reveal */
export const numberPop = {
  initial:  { opacity: 0, scale: 0.88 },
  animate:  { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.16,1,0.3,1] } },
};
