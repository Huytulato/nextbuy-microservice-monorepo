'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ShoppingBag, Truck, Shield, Headphones, ArrowRight, Sparkles, Percent, Gift } from 'lucide-react'

// Banner slides data
const bannerSlides = [
  {
    id: 1,
    title: "Summer Sale",
    subtitle: "Up to 50% Off",
    description: "Discover amazing deals on electronics, fashion, home & more",
    buttonText: "Shop Now",
    buttonLink: "/products?sale=summer",
    bgGradient: "from-red-700 via-red-600 to-red-800",
    accentColor: "#ffbf34",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80",
  },
  {
    id: 2,
    title: "New Arrivals",
    subtitle: "Fresh Styles 2024",
    description: "Be the first to get the latest trending products",
    buttonText: "Explore",
    buttonLink: "/products?sort=latest",
    bgGradient: "from-amber-600 via-orange-500 to-red-600",
    accentColor: "#fff",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80",
  },
  {
    id: 3,
    title: "Flash Deals",
    subtitle: "Limited Time Only",
    description: "Grab exclusive discounts before they're gone!",
    buttonText: "View Deals",
    buttonLink: "/deals",
    bgGradient: "from-purple-700 via-red-600 to-pink-600",
    accentColor: "#ffbf34",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80",
  },
]

// Category quick links
const quickCategories = [
  { name: "Electronics", icon: "📱", link: "/products?category=electronics", color: "bg-blue-50 hover:bg-blue-100" },
  { name: "Fashion", icon: "👗", link: "/products?category=fashion", color: "bg-pink-50 hover:bg-pink-100" },
  { name: "Home & Living", icon: "🏠", link: "/products?category=home", color: "bg-green-50 hover:bg-green-100" },
  { name: "Beauty", icon: "💄", link: "/products?category=beauty", color: "bg-purple-50 hover:bg-purple-100" },
  { name: "Sports", icon: "⚽", link: "/products?category=sports", color: "bg-orange-50 hover:bg-orange-100" },
  { name: "Books", icon: "📚", link: "/products?category=books", color: "bg-yellow-50 hover:bg-yellow-100" },
]

// Features/benefits
const features = [
  { icon: Truck, title: "Free Shipping", description: "On orders over $50" },
  { icon: Shield, title: "Secure Payment", description: "100% protected" },
  { icon: Headphones, title: "24/7 Support", description: "Dedicated support" },
  { icon: Gift, title: "Gift Cards", description: "For your loved ones" },
]

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // Auto-play slides
  useEffect(() => {
    if (!isAutoPlaying) return
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % bannerSlides.length)
    setIsAutoPlaying(false)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length)
    setIsAutoPlaying(false)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    setIsAutoPlaying(false)
  }

  const currentBanner = bannerSlides[currentSlide]

  return (
    <section className="w-full">
      {/* Main Hero Banner */}
      <div className="relative w-full overflow-hidden">
        <div 
          className={`relative w-full min-h-[400px] md:min-h-[500px] lg:min-h-[550px] bg-gradient-to-r ${currentBanner.bgGradient} transition-all duration-700`}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center py-12 lg:py-16">
              {/* Content */}
              <div className="text-white space-y-6 z-10">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                  <Sparkles className="w-4 h-4 text-[#ffbf34]" />
                  <span className="text-sm font-medium">{currentBanner.subtitle}</span>
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight font-Poppins">
                  {currentBanner.title}
                </h1>
                
                <p className="text-lg md:text-xl text-white/90 max-w-md font-Roboto">
                  {currentBanner.description}
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <Link 
                    href={currentBanner.buttonLink}
                    className="inline-flex items-center gap-2 bg-[#ffbf34] hover:bg-[#e6ac2f] text-gray-900 font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    {currentBanner.buttonText}
                  </Link>
                  <Link 
                    href="/categories"
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold px-8 py-4 rounded-full border border-white/30 transition-all duration-300"
                  >
                    Browse Categories
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-8 pt-4">
                  <div>
                    <p className="text-3xl font-bold text-[#ffbf34]">50K+</p>
                    <p className="text-sm text-white/70">Products</p>
                  </div>
                  <div className="w-px h-12 bg-white/20"></div>
                  <div>
                    <p className="text-3xl font-bold text-[#ffbf34]">10K+</p>
                    <p className="text-sm text-white/70">Sellers</p>
                  </div>
                  <div className="w-px h-12 bg-white/20"></div>
                  <div>
                    <p className="text-3xl font-bold text-[#ffbf34]">100K+</p>
                    <p className="text-sm text-white/70">Happy Customers</p>
                  </div>
                </div>
              </div>

              {/* Image */}
              <div className="relative hidden lg:flex justify-center items-center">
                <div className="relative w-[400px] h-[400px]">
                  {/* Decorative circles */}
                  <div className="absolute inset-0 bg-white/10 rounded-full animate-pulse"></div>
                  <div className="absolute inset-4 bg-white/5 rounded-full"></div>
                  
                  {/* Main image */}
                  <div className="absolute inset-8 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
                    <img 
                      src={currentBanner.image}
                      alt={currentBanner.title}
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                    />
                  </div>

                  {/* Floating badges */}
                  <div className="absolute -top-4 right-0 bg-[#ffbf34] text-gray-900 px-4 py-2 rounded-full font-bold shadow-lg animate-bounce">
                    <div className="flex items-center gap-1">
                      <Percent className="w-4 h-4" />
                      <span>50% OFF</span>
                    </div>
                  </div>
                  <div className="absolute bottom-10 -left-8 bg-white text-gray-900 px-4 py-3 rounded-xl shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Truck className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Free Delivery</p>
                        <p className="text-sm font-semibold">Orders $50+</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button 
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Slide Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
            {bannerSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'bg-[#ffbf34] w-8' 
                    : 'bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Quick Categories */}
      <div className="bg-white py-6 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {quickCategories.map((category) => (
              <Link
                key={category.name}
                href={category.link}
                className={`flex items-center gap-3 px-6 py-3 ${category.color} rounded-full whitespace-nowrap transition-all duration-300 hover:scale-105 hover:shadow-md`}
              >
                <span className="text-2xl">{category.icon}</span>
                <span className="font-medium text-gray-700">{category.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Features Bar */}
      <div className="bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div 
                key={feature.title}
                className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-red-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-500">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Promotional Banners */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Promo 1 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 to-red-700 p-6 text-white group cursor-pointer hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-[#ffbf34]">Weekend Special</p>
              <h3 className="text-xl font-bold mt-1">Electronics Sale</h3>
              <p className="text-sm text-white/80 mt-2">Save up to 40% on gadgets</p>
              <Link 
                href="/products?category=electronics"
                className="inline-flex items-center gap-1 mt-4 text-[#ffbf34] font-semibold text-sm group-hover:gap-2 transition-all duration-300"
              >
                Shop Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Promo 2 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white group cursor-pointer hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-white/90">New Collection</p>
              <h3 className="text-xl font-bold mt-1">Fashion Trends</h3>
              <p className="text-sm text-white/80 mt-2">Latest styles just arrived</p>
              <Link 
                href="/products?category=fashion"
                className="inline-flex items-center gap-1 mt-4 text-white font-semibold text-sm group-hover:gap-2 transition-all duration-300"
              >
                Explore <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Promo 3 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white group cursor-pointer hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-[#ffbf34]">Limited Offer</p>
              <h3 className="text-xl font-bold mt-1">Beauty Box</h3>
              <p className="text-sm text-white/80 mt-2">Free gift with purchase</p>
              <Link 
                href="/products?category=beauty"
                className="inline-flex items-center gap-1 mt-4 text-[#ffbf34] font-semibold text-sm group-hover:gap-2 transition-all duration-300"
              >
                Get Yours <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero