'use client'
import React from 'react'
import { Star } from 'lucide-react'

// Rating types
interface RatingProps {
  rating: number
  maxRating?: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showValue?: boolean
  showCount?: boolean
  reviewCount?: number
  variant?: 'default' | 'compact' | 'detailed'
  interactive?: boolean
  onChange?: (rating: number) => void
  readonly?: boolean
  className?: string
}

interface RatingBreakdown {
  star: number
  count: number
  percentage: number
}

interface RatingSummaryProps {
  averageRating: number
  totalReviews: number
  breakdown: RatingBreakdown[]
  className?: string
}

// Size configurations
const sizeConfig = {
  xs: { star: 'w-3 h-3', text: 'text-xs', gap: 'gap-0.5' },
  sm: { star: 'w-4 h-4', text: 'text-sm', gap: 'gap-0.5' },
  md: { star: 'w-5 h-5', text: 'text-base', gap: 'gap-1' },
  lg: { star: 'w-6 h-6', text: 'text-lg', gap: 'gap-1' },
}

// Main Rating component
export const Rating: React.FC<RatingProps> = ({
  rating,
  maxRating = 5,
  size = 'sm',
  showValue = false,
  showCount = false,
  reviewCount = 0,
  variant = 'default',
  interactive = false,
  onChange,
  readonly = true,
  className = '',
}) => {
  const [hoverRating, setHoverRating] = React.useState<number | null>(null)
  const config = sizeConfig[size]

  const displayRating = hoverRating !== null ? hoverRating : rating
  const fullStars = Math.floor(displayRating)
  const hasHalfStar = displayRating % 1 >= 0.5
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0)

  const handleClick = (value: number) => {
    if (interactive && !readonly && onChange) {
      onChange(value)
    }
  }

  const handleMouseEnter = (value: number) => {
    if (interactive && !readonly) {
      setHoverRating(value)
    }
  }

  const handleMouseLeave = () => {
    if (interactive && !readonly) {
      setHoverRating(null)
    }
  }

  const renderStar = (index: number, type: 'full' | 'half' | 'empty') => {
    const starValue = index + 1
    const cursorClass = interactive && !readonly ? 'cursor-pointer' : ''
    
    return (
      <span
        key={`${type}-${index}`}
        onClick={() => handleClick(starValue)}
        onMouseEnter={() => handleMouseEnter(starValue)}
        className={`inline-block ${cursorClass} transition-transform duration-150 ${
          interactive && !readonly ? 'hover:scale-110' : ''
        }`}
      >
        {type === 'full' && (
          <Star className={`${config.star} fill-yellow-400 text-yellow-400`} />
        )}
        {type === 'half' && (
          <div className={`relative ${config.star}`}>
            <Star className="absolute inset-0 text-gray-300" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="fill-yellow-400 text-yellow-400" style={{ width: '200%' }} />
            </div>
          </div>
        )}
        {type === 'empty' && (
          <Star className={`${config.star} text-gray-300`} />
        )}
      </span>
    )
  }

  // Compact variant - just stars inline
  if (variant === 'compact') {
    return (
      <div className={`flex items-center ${config.gap} ${className}`} onMouseLeave={handleMouseLeave}>
        {[...Array(fullStars)].map((_, i) => renderStar(i, 'full'))}
        {hasHalfStar && renderStar(fullStars, 'half')}
        {[...Array(emptyStars)].map((_, i) => renderStar(fullStars + (hasHalfStar ? 1 : 0) + i, 'empty'))}
        {showValue && (
          <span className={`${config.text} text-gray-600 font-medium ml-1`}>
            {rating.toFixed(1)}
          </span>
        )}
      </div>
    )
  }

  // Detailed variant - with count and additional info
  if (variant === 'detailed') {
    return (
      <div className={`flex items-center ${config.gap} ${className}`} onMouseLeave={handleMouseLeave}>
        <div className="flex items-center">
          {[...Array(fullStars)].map((_, i) => renderStar(i, 'full'))}
          {hasHalfStar && renderStar(fullStars, 'half')}
          {[...Array(emptyStars)].map((_, i) => renderStar(fullStars + (hasHalfStar ? 1 : 0) + i, 'empty'))}
        </div>
        <span className={`${config.text} text-gray-800 font-semibold`}>
          {rating.toFixed(1)}
        </span>
        {showCount && reviewCount > 0 && (
          <span className={`${config.text} text-gray-500`}>
            ({reviewCount.toLocaleString()} {reviewCount === 1 ? 'review' : 'reviews'})
          </span>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className={`flex items-center ${config.gap} ${className}`} onMouseLeave={handleMouseLeave}>
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => renderStar(i, 'full'))}
        {hasHalfStar && renderStar(fullStars, 'half')}
        {[...Array(emptyStars)].map((_, i) => renderStar(fullStars + (hasHalfStar ? 1 : 0) + i, 'empty'))}
      </div>
      {showValue && (
        <span className={`${config.text} text-gray-600 ml-1`}>
          ({rating.toFixed(1)})
        </span>
      )}
      {showCount && reviewCount > 0 && (
        <span className={`${config.text} text-gray-500 ml-1`}>
          · {reviewCount.toLocaleString()} {reviewCount === 1 ? 'review' : 'reviews'}
        </span>
      )}
    </div>
  )
}

// Interactive Rating Input component (for forms)
export const RatingInput: React.FC<{
  value: number
  onChange: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
  label?: string
  helperText?: string
  error?: string
  required?: boolean
  className?: string
}> = ({
  value,
  onChange,
  size = 'md',
  label,
  helperText,
  error,
  required = false,
  className = '',
}) => {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null)
  const config = sizeConfig[size]
  const displayValue = hoverValue !== null ? hoverValue : value

  const ratingLabels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="flex items-center gap-3">
        <div 
          className={`flex items-center ${config.gap}`}
          onMouseLeave={() => setHoverValue(null)}
        >
          {[1, 2, 3, 4, 5].map((starValue) => (
            <button
              key={starValue}
              type="button"
              onClick={() => onChange(starValue)}
              onMouseEnter={() => setHoverValue(starValue)}
              className="focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 rounded transition-transform duration-150 hover:scale-110"
            >
              <Star 
                className={`${config.star} transition-colors duration-150 ${
                  starValue <= displayValue 
                    ? 'fill-yellow-400 text-yellow-400' 
                    : 'text-gray-300 hover:text-yellow-200'
                }`} 
              />
            </button>
          ))}
        </div>
        
        {displayValue > 0 && (
          <span className={`${config.text} font-medium text-gray-700 min-w-[80px]`}>
            {ratingLabels[displayValue - 1]}
          </span>
        )}
      </div>

      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

// Rating Summary component (for product pages)
export const RatingSummary: React.FC<RatingSummaryProps> = ({
  averageRating,
  totalReviews,
  breakdown,
  className = '',
}) => {
  return (
    <div className={`flex flex-col md:flex-row gap-6 ${className}`}>
      {/* Average Rating */}
      <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl min-w-[160px]">
        <span className="text-5xl font-bold text-gray-900">
          {averageRating.toFixed(1)}
        </span>
        <Rating rating={averageRating} size="md" className="mt-2" />
        <span className="text-sm text-gray-500 mt-2">
          Based on {totalReviews.toLocaleString()} reviews
        </span>
      </div>

      {/* Rating Breakdown */}
      <div className="flex-1 space-y-3">
        {breakdown.map(({ star, count, percentage }) => (
          <div key={star} className="flex items-center gap-3">
            <div className="flex items-center gap-1 w-12">
              <span className="text-sm font-medium text-gray-700">{star}</span>
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            </div>
            
            <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            
            <span className="text-sm text-gray-500 w-12 text-right">
              {count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Single Rating Badge (compact display)
export const RatingBadge: React.FC<{
  rating: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'filled' | 'outlined'
  className?: string
}> = ({ rating, size = 'sm', variant = 'filled', className = '' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  const getBgColor = () => {
    if (rating >= 4) return variant === 'filled' ? 'bg-green-600' : 'border-green-600 text-green-600'
    if (rating >= 3) return variant === 'filled' ? 'bg-yellow-500' : 'border-yellow-500 text-yellow-500'
    return variant === 'filled' ? 'bg-red-500' : 'border-red-500 text-red-500'
  }

  return (
    <span 
      className={`inline-flex items-center gap-1 rounded font-semibold ${sizeClasses[size]} ${getBgColor()} ${
        variant === 'filled' ? 'text-white' : 'bg-transparent border'
      } ${className}`}
    >
      {rating.toFixed(1)}
      <Star className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-3.5 h-3.5' : 'w-4 h-4'} fill-current`} />
    </span>
  )
}

// Helper function to calculate rating breakdown
export const calculateRatingBreakdown = (reviews: { rating: number }[]): RatingBreakdown[] => {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  const total = reviews.length

  reviews.forEach((review) => {
    const roundedRating = Math.round(review.rating)
    if (roundedRating >= 1 && roundedRating <= 5) {
      counts[roundedRating as keyof typeof counts]++
    }
  })

  return [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: counts[star as keyof typeof counts],
    percentage: total > 0 ? (counts[star as keyof typeof counts] / total) * 100 : 0,
  }))
}

// Calculate average rating from reviews
export const calculateAverageRating = (reviews: { rating: number }[]): number => {
  if (reviews.length === 0) return 0
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
  return sum / reviews.length
}

export default Rating