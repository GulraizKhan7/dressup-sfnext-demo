import React from 'react';

const saleItems = [
  {
    id: 1,
    image: "/images/sub1.webp",
    title: "Chelsea Boots on Sale",
    description: "Save up to 15% on 2976 and Sinclair Chelsea styles. Ends Sunday. Restrictions apply.",
    badge: "Chelsea Savings Event",
    linkText: "See Restrictions"
  },
  {
    id: 2,
    image: "/images/sub2.webp",
    title: "Platforms on Sale",
    description: "Get up to 15% off select Jadon and Sinclair platform styles through Sunday.",
    badge: "Platform Savings Event",
    linkText: "See Restrictions"
  },
  {
    id: 3,
    image: "/images/sub3.webp",
    title: "Kids' Boots on Sale",
    description: "Save on 1460 and 2976 styles sized down for kids. While supplies last.",
    badge: "Kids' Savings Event",
    linkText: "See Restrictions"
  },
  {
    id: 4,
    image: "/images/sub4.webp",
    title: "Men's Icons on Sale",
    description: "Save up to 20% on 1460, 101 and Combs styles. Ends Sunday.",
    badge: "Men's Savings Event",
    linkText: "See Restrictions"
  },
  {
    id: 5,
    image: "/images/sub5.webp",
    title: "Women's Best Sellers",
    description: "Discover top-rated styles loved by everyone this season.",
    badge: "Women's Event",
    linkText: "See Restrictions"
  },
  {
    id: 6,
    image: "/images/sub6.webp",
    title: "Accessories on Sale",
    description: "Complete your look with bags, socks and care kits at special prices.",
    badge: "Accessories Event",
    linkText: "See Restrictions"
  }
];

export default function MainStartHere() {
  return (
    <section className="w-full max-w-[1900px] mx-auto px-6 lg:px-12 py-12 bg-white font-sans select-none">
      
      {/* Section Header */}
      <div className="mb-8">
        <h2 className="text-xl lg:text-3xl font-bold text-gray-900 tracking-tight">
          Up to 20% Off — Final Hours
        </h2>
      </div>

      {/* Grid Layout (Desktop par aik line mein 6 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
        {saleItems.map((item) => (
          <div
            key={item.id}
            className="flex flex-col group cursor-pointer"
          >
            {/* Card Image */}
            <div className="w-full h-[280px] sm:h-[320px] lg:h-[360px] overflow-hidden rounded-lg bg-gray-100 mb-4">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Title & Description */}
            <h3 className="text-sm lg:text-xl font-bold text-gray-900 mb-1">
              {item.title}
            </h3>
            <p className="text-xs text-gray-600 mb-3 line-clamp-3 leading-relaxed">
              {item.description}
            </p>

            {/* Bottom Badge & Link */}
            <div className="flex flex-col items-start gap-2 mt-auto pt-1">
              <span className="px-5 py-2 bg-gray-900 text-white text-[14px] font-semibold rounded hover:bg-black transition-colors">
                {item.badge}
              </span>
              <a href="#" className="text-[12px] font-medium text-gray-900 hover:underline text-center">
                {item.linkText}
              </a>
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}