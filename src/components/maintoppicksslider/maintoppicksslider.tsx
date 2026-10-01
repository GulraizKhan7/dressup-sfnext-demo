import  { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const tabs = [
  "New Markdowns",
  "Women's Work Clothing, Shoes & Accessories",
  "Men's Work & Business Casual Outfits",
  "Women's Under $100",
  "Men's Under $100",
  "Women's New Arrivals"
];

const products = [
  {
    id: 1,
    category: "New Markdowns",
    badge: "New Markdown",
    brand: "adidas",
    title: "Add to bag or wish list to see price",
   price: "$22.50",
    originalPrice: "",
    rating: 5,
    reviews: 24549,
    image: "/images/image1.webp",
    colors: ["bg-amber-800", "bg-red-900", "bg-stone-800", "bg-black"]
  },
  {
    id: 2,
    category: "New Markdowns",
    badge: "New Markdown",
    brand: "Bombas",
    title: "Ankle Sock 4-Pack",
    price: "$22.50",
    originalPrice: "$45",
    rating: 5,
    reviews: 5,
    image: "/images/image2.webp",
    colors: ["bg-stone-900", "bg-amber-900", "bg-stone-300"]
  },
  {
    id: 3,
    category: "New Markdowns",
    badge: "New Markdown",
    brand: "DAZE",
    title: "Wide Leg Jeans",
    price: "$39.20",
    originalPrice: "$98",
    rating: 4,
    reviews: 10,
   image: "/images/image3.webp",
    colors: ["bg-blue-400"]
  },
  {
    id: 4,
    category: "New Markdowns",
    badge: "New Markdown",
    brand: "CeCe",
    title: "Chiffon Blouse",
    price: "$27.60 - $69",
    originalPrice: "$69",
    rating: 4,
    reviews: 83,
    image: "/images/image4.webp",
    colors: ["bg-black", "bg-white", "bg-emerald-800", "bg-red-700"]
  },
  {
    id: 5,
    category: "New Markdowns",
    badge: "New Markdown",
    brand: "Donna Karan New York",
    title: "Midi Shirt Dress",
    price: "$98.55",
    originalPrice: "$219",
    rating: 4,
    reviews: 11,
    image: "/images/image5.webp",
    colors: ["bg-red-950"]
  },
  {
    id: 6,
    category: "New Markdowns",
    badge: "New Markdown",
    brand: "Birkenstock",
    title: "Boston Clog",
    price: "$99.99 - $160",
    originalPrice: "",
    rating: 5,
    reviews: 120,
    image: "/images/image6.webp",
    colors: ["bg-amber-700", "bg-black"]
  },
  {
    id: 3,
    category: "New Markdowns",
    badge: "New Markdown",
    brand: "DAZE",
    title: "Wide Leg Jeans",
    price: "$39.20",
    originalPrice: "$98",
    rating: 4,
    reviews: 10,
   image: "/images/image2.webp",
    colors: ["bg-blue-400"]
  },
  {
    id: 4,
    category: "New Markdowns",
    badge: "New Markdown",
    brand: "CeCe",
    title: "Chiffon Blouse",
    price: "$27.60 - $69",
    originalPrice: "$69",
    rating: 4,
    reviews: 83,
    image: "/images/image4.webp",
    colors: ["bg-black", "bg-white", "bg-emerald-800", "bg-red-700"]
  },
  {
    id: 5,
    category: "New Markdowns",
    badge: "New Markdown",
    brand: "Donna Karan New York",
    title: "Midi Shirt Dress",
    price: "$98.55",
    originalPrice: "$219",
    rating: 4,
    reviews: 11,
    image: "/images/image5.webp",
    colors: ["bg-red-950"]
  },
];

export default function TopPicksSlider() {
  const [activeTab, setActiveTab] = useState("New Markdowns");

  const scrollLeft = () => {
    const container = document.getElementById("product-slider");
    container.scrollBy({ left: -320, behavior: 'smooth' });
  };

  const scrollRight = () => {
    const container = document.getElementById("product-slider");
    container.scrollBy({ left: 320, behavior: 'smooth' });
  };

  return (
    <section className="w-full max-w-[1900px] mx-auto px-6 lg:px-12 py-8 bg-white font-sans select-none">
      {/* Section Heading */}
      <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4">
        Cool Bottles
      </h2>

      {/* Category Tabs */}
      <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap border-b border-gray-200 pb-3 mb-8 scrollbar-none">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(tab)}
            className={`text-sm lg:text-base font-medium pb-1 relative transition-colors cursor-pointer`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Slider Wrapper with Spaced Arrows */}
      <div className="relative px-8 lg:px-12">
        {/* Left Arrow Button */}
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-300 text-black w-10 h-10 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-all cursor-pointer"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Product Cards Container */}
        <div
          id="product-slider"
          className="flex items-stretch gap-6 overflow-x-auto scrollbar-none scroll-smooth pb-4 pt-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="flex-shrink-0 w-[240px] lg:w-[260px] bg-white border border-gray-200 rounded-lg flex flex-col justify-between overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div>
                {/* 1. Top Image Area */}
                <div className="relative bg-[#f4f4f4] h-[320px] p-4 flex items-center justify-center">
                  <span className="absolute top-3 left-3 text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
                    {product.status}
                  </span>
                  <img
                    src={product.image}
                    alt={product.brand}
                    className="w-full h-full object-cover object-center rounded"
                  />
                </div>

                {/* Content Section */}
                <div className="p-4 flex flex-col">
                  {/* 2. Color Swatches (Neche Image ke foran baad) */}
                  <div className="flex items-center gap-1.5 mb-3">
                    {product.colors.map((color, cIdx) => (
                      <span
                        key={cIdx}
                        className={`w-4 h-4 rounded-full border border-gray-300 ${color} inline-block cursor-pointer shadow-xs`}
                      ></span>
                    ))}
                  </div>

                  {/* 3. Title & Brand (Product Title & Brand Name) */}
                  <span className="text-xs font-bold text-[#cc0000] uppercase tracking-wide block mb-1">
                    {product.badge}
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                    {product.brand}
                  </h3>
                  <p className="text-xs text-gray-700 mt-1 line-clamp-2">
                    {product.title}
                  </p>
                </div>
              </div>

              {/* 4. Pricing & Ratings (Sabse Nichay) */}
              <div className="p-4 pt-0">
                {product.price && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-gray-900">{product.price}</span>
                    {product.originalPrice && (
                      <span className="text-xs text-gray-500 line-through">{product.originalPrice}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <div className="flex text-black text-xs">
                    {"★".repeat(product.rating)}{"☆".repeat(5 - product.rating)}
                  </div>
                  <span className="text-xs text-gray-500">({product.reviews})</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-300 text-black w-10 h-10 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-all cursor-pointer"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}