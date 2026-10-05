import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const carouselItems = [
  { id: 1, key: 'item1', image: "/images/new1.webp", hasBadge2: true },
  { id: 2, key: 'item2', image: "/images/new2.webp", hasBadge2: false },
  { id: 3, key: 'item3', image: "/images/new3.webp", hasBadge2: true },
  { id: 4, key: 'item4', image: "/images/new4.webp", hasBadge2: false },
  { id: 5, key: 'item5', image: "/images/new5.webp", hasBadge2: false }
] as const;

export default function MainBagSection() {
  const { t } = useTranslation('home');
  const scrollRef = useRef(null);

  // Left & Right Scroll Handlers
  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -420, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 420, behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full max-w-[1900px] mx-auto px-6 lg:px-12 py-12 bg-white font-sans select-none">
      
      {/* Header section with Title and Top-Right Navigation Buttons */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl lg:text-4xl font-bold text-gray-900 tracking-tight">
          {t('main.featuredCollections.title')}
        </h2>
        
        {/* Top-Right Navigation Arrows */}
        <div className="flex items-center space-x-2">
          <button
            onClick={scrollLeft}
            className="w-10 h-10 rounded border border-gray-300 hover:border-black flex items-center justify-center bg-white text-gray-800 hover:text-black transition-colors cursor-pointer shadow-2xs"
            aria-label={t('main.featuredCollections.previous')}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={scrollRight}
            className="w-10 h-10 rounded border border-gray-300 hover:border-black flex items-center justify-center bg-white text-gray-800 hover:text-black transition-colors cursor-pointer shadow-2xs"
            aria-label={t('main.featuredCollections.next')}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Carousel Container */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scrollbar-none scroll-smooth pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {carouselItems.map((item) => (
          <div
            key={item.id}
            className="min-w-[280px] sm:min-w-[320px] lg:min-w-[calc(33.333%-16px)] flex flex-col flex-shrink-0 group cursor-pointer"
          >
            {/* Card Image Container (Balanced height: h-[350px] sm:h-[400px] lg:h-[480px]) */}
            <div className="w-full h-[350px] sm:h-[400px] lg:h-[480px] overflow-hidden rounded-lg bg-gray-100 mb-4 flex items-center justify-center">
              <img
                src={item.image}
                alt={t(`main.featuredCollections.${item.key}.title`)}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Title & Description */}
            <h3 className="text-base lg:text-xl font-bold text-gray-900 mb-1.5">
              {t(`main.featuredCollections.${item.key}.title`)}
            </h3>
            <p className="text-xs lg:text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
              {t(`main.featuredCollections.${item.key}.description`)}
            </p>

            {/* Bottom Action Badges / Buttons */}
            <div className="flex flex-wrap items-center gap-3 mt-auto">
              <span className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded hover:bg-black transition-colors">
                {t(`main.featuredCollections.${item.key}.badge1`)}
              </span>
              {item.hasBadge2 && (
                <span className="text-sm font-medium text-gray-900 hover:underline">
                  {t(`main.featuredCollections.${item.key}.badge2` as 'main.featuredCollections.item1.badge2')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}