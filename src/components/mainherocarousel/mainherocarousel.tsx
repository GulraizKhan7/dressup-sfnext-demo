import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  { id: 1, key: 'slide1', image: "/images/hero.webp" },
  { id: 2, key: 'slide2', image: "/images/web-banner.webp" },
  { id: 3, key: 'slide3', image: "/images/hero.webp" },
  { id: 4, key: 'slide4', image: "/images/wordrobe1.webp" }
] as const;

export default function HeroCarousel() {
  const { t } = useTranslation('home');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Autoplay effect - har 4 seconds baad slide auto change hogi
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? slides.length - 1 : prevIndex - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
  };

  return (
    <div className="relative w-full h-[550px] lg:h-[900px] overflow-hidden bg-gray-900 select-none">
      {/* Background Images with Fade Transition */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          <img
            src={slide.image}
            alt={t(`main.heroCarousel.${slide.key}.title`)}
            className="w-full h-full object-cover object-center"
          />
          {/* Bottom Gradient Overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        </div>
      ))}

      {/* Left Circular Arrow Button */}
      <button
        onClick={prevSlide}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-20 bg-white hover:bg-white/90 text-black w-20 h-20 rounded-full shadow-md flex items-center justify-center transition-all cursor-pointer"
        aria-label={t('main.heroCarousel.previous')}
      >
        <ChevronLeft size={40} strokeWidth={2} />
      </button>

      {/* Right Circular Arrow Button */}
      <button
        onClick={nextSlide}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-20 bg-white hover:bg-white/90 text-black w-20 h-20 rounded-full shadow-md flex items-center justify-center transition-all cursor-pointer"
        aria-label={t('main.heroCarousel.next')}
      >
        <ChevronRight size={40} strokeWidth={2} />
      </button>

      {/* Bottom Content Area */}
      <div className="absolute bottom-10 left-8 lg:left-16 right-8 lg:right-16 z-20 flex justify-between items-end text-white">
        {/* Left Side: Title & Tags */}
        <div className="flex flex-col gap-3 max-w-6xl mb-3">
          <h1 className="text-2xl lg:text-6xl font-light tracking-wide drop-shadow-sm mb-2">
            {t(`main.heroCarousel.${slides[currentIndex].key}.title`)}
          </h1>
          <div className="flex items-center gap-2.5 flex-wrap py-4">
            {(['tag1', 'tag2'] as const).map((tagKey) => (
              <span
                key={tagKey}
                className="bg-white text-black text-[28px] lg:text-[22px] font-medium px-5 py-4 rounded shadow-sm"
              >
                {t(`main.heroCarousel.${slides[currentIndex].key}.${tagKey}`)}
              </span>
            ))}
          </div>
        </div>

        {/* Right Side: Slide Counter & Circular Progress Bar */}
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
          <span className="text-xs font-mono tracking-wider">
            {currentIndex + 1} / {slides.length}
          </span>
          {/* Circular Autoplay Progress Indicator */}
          <div className="relative w-5 h-5 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="10"
                cy="10"
                r="8"
                stroke="currentColor"
                strokeWidth="2"
                className="text-white/30 fill-none"
              />
              <circle
                cx="10"
                cy="10"
                r="8"
                stroke="currentColor"
                strokeWidth="2"
                className="text-white fill-none transition-all duration-1000"
                strokeDasharray="50.2"
                strokeDashoffset={50.2 - ((currentIndex + 1) / slides.length) * 50.2}
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}