'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Page() {
  const router = useRouter()
  const [currentCarSlide, setCurrentCarSlide] = useState(0)
  const [activeNav, setActiveNav] = useState('home')
  const [userName] = useState('John Doe') // You can make this dynamic later
  const [currentPlan, setCurrentPlan] = useState(null) // Store user's current plan
  
  // Modal states
  const [showRechargeModal, setShowRechargeModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [rechargeAmount, setRechargeAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('easypaisa')
  const [selectedWithdrawMethod, setSelectedWithdrawMethod] = useState('easypaisa')
  const [withdrawAccountName, setWithdrawAccountName] = useState('')
  const [paymentDetails, setPaymentDetails] = useState({
    easypaisa: { number: '', accountName: '' },
    jazzcash: { number: '', accountName: '' }
  })
  
  // Coupon states
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [userBalance, setUserBalance] = useState(0)
  const [userData, setUserData] = useState(null)
  
  // Income tracking states
  const [todayIncome, setTodayIncome] = useState(0)
  const [cumulativeIncome, setCumulativeIncome] = useState(0)

  const totalCarSlides = 4
  
  const withdrawals = [
    { name: 'Sarah M.', phone: '+92 300 ****567', amount: '$1,250', time: '2 minutes ago', color: 'green' },
    { name: 'Mike R.', phone: '+92 301 ****234', amount: '$850', time: '5 minutes ago', color: 'blue' },
    { name: 'Emma L.', phone: '+92 302 ****789', amount: '$2,100', time: '7 minutes ago', color: 'purple' },
    { name: 'David K.', phone: '+92 303 ****456', amount: '$675', time: '12 minutes ago', color: 'yellow' },
    { name: 'Lisa P.', phone: '+92 304 ****321', amount: '$1,500', time: '15 minutes ago', color: 'red' },
    { name: 'Alex T.', phone: '+92 305 ****654', amount: '$950', time: '18 minutes ago', color: 'indigo' }
  ]
  
  // For mobile auto-scrolling
  const [currentInvestmentSlide, setCurrentInvestmentSlide] = useState(0)
  
  // Auto-advance investment slider on mobile
  useEffect(() => {    
    const investmentInterval = setInterval(() => {
      setCurrentInvestmentSlide((prev) => (prev + 1) % withdrawals.length)
    }, 3000)
    
    return () => {
      clearInterval(investmentInterval)
    }
  }, [withdrawals.length])

  const firstName = userName.split(' ')[0]
  const userInitial = userName.charAt(0).toUpperCase()

  // Auto-advance car carousel
  useEffect(() => {    
    const carInterval = setInterval(() => {
      setCurrentCarSlide((prev) => (prev + 1) % totalCarSlides)
    }, 3000)
    
    return () => {
      clearInterval(carInterval)
    }
  }, [totalCarSlides])
  
  // Check if plan is expired based on validity period
  const isPlanExpired = (plan) => {
    if (!plan || !plan.investDate) return false
    
    const investDate = new Date(plan.investDate)
    const currentDate = new Date()
    
    // Parse validity period (e.g., "30 days", "200 days")
    const validityMatch = plan.validity.match(/(\d+)\s*days?/i)
    if (!validityMatch) return false
    
    const validityDays = parseInt(validityMatch[1])
    const expirationDate = new Date(investDate.getTime() + (validityDays * 24 * 60 * 60 * 1000))
    
    return currentDate > expirationDate
  }

  // Get remaining days for current plan
  const getRemainingDays = (plan) => {
    if (!plan || !plan.investDate) return 0
    
    const investDate = new Date(plan.investDate)
    const currentDate = new Date()
    
    // Parse validity period (e.g., "30 days", "200 days")
    const validityMatch = plan.validity.match(/(\d+)\s*days?/i)
    if (!validityMatch) return 0
    
    const validityDays = parseInt(validityMatch[1])
    const expirationDate = new Date(investDate.getTime() + (validityDays * 24 * 60 * 60 * 1000))
    
    const remainingTime = expirationDate.getTime() - currentDate.getTime()
    const remainingDays = Math.ceil(remainingTime / (24 * 60 * 60 * 1000))
    
    return Math.max(0, remainingDays)
  }

  // Load current plan from localStorage on component mount
  useEffect(() => {
    const savedPlan = localStorage.getItem('currentPlan')
    if (savedPlan) {
      const plan = JSON.parse(savedPlan)
      
      // Check if plan is expired
      if (isPlanExpired(plan)) {
        // Plan is expired, remove it and show no plan message
        localStorage.removeItem('currentPlan')
        setCurrentPlan(null)
        
        // Also update the plan status in investment history
        if (userData) {
          const investmentHistory = JSON.parse(localStorage.getItem(`investmentHistory_${userData.phone}`) || '[]')
          const updatedHistory = investmentHistory.map(investment => {
            if (investment.planId === plan.id) {
              return { ...investment, status: 'expired' }
            }
            return investment
          })
          localStorage.setItem(`investmentHistory_${userData.phone}`, JSON.stringify(updatedHistory))
        }
      } else {
        setCurrentPlan(plan)
      }
    }
    
    // Load payment details
    const storedPaymentDetails = localStorage.getItem('paymentDetails')
    if (storedPaymentDetails) {
      setPaymentDetails(JSON.parse(storedPaymentDetails))
    } else {
      // Default payment details
      const defaultPaymentDetails = {
        easypaisa: { number: '0300 1234567', accountName: 'Honda Civic Investment' },
        jazzcash: { number: '0300 7654321', accountName: 'Honda Civic Investment' }
      }
      setPaymentDetails(defaultPaymentDetails)
      localStorage.setItem('paymentDetails', JSON.stringify(defaultPaymentDetails))
    }

    // Load user data and balance
    const storedUserData = localStorage.getItem('userData')
    if (storedUserData) {
      const user = JSON.parse(storedUserData)
      setUserData(user)
      const balance = parseFloat(localStorage.getItem(`userBalance_${user.phone}`) || '0')
      setUserBalance(balance)
    }
  }, [])

  // Refresh balance when userData changes
  useEffect(() => {
    if (userData) {
      const balance = parseFloat(localStorage.getItem(`userBalance_${userData.phone}`) || '0')
      setUserBalance(balance)
      calculateIncome()
    }
  }, [userData])

  // Calculate income from various sources
  const calculateIncome = () => {
    if (!userData) return

    const today = new Date().toDateString()
    let todayTotal = 0
    let cumulativeTotal = 0

    // Calculate from approved recharge requests (income from deposits)
    const rechargeHistory = JSON.parse(localStorage.getItem('rechargeHistory') || '[]')
    const userRecharges = rechargeHistory.filter(req => 
      req.userId === userData.phone && req.status === 'approved'
    )
    
    userRecharges.forEach(recharge => {
      const rechargeDate = new Date(recharge.date).toDateString()
      const amount = parseFloat(recharge.amount)
      
      if (rechargeDate === today) {
        todayTotal += amount
      }
      cumulativeTotal += amount
    })

    // Calculate from approved withdrawal requests (income from withdrawals)
    const withdrawHistory = JSON.parse(localStorage.getItem('withdrawHistory') || '[]')
    const userWithdrawals = withdrawHistory.filter(req => 
      req.userId === userData.phone && req.status === 'approved'
    )
    
    userWithdrawals.forEach(withdraw => {
      const withdrawDate = new Date(withdraw.date).toDateString()
      const amount = parseFloat(withdraw.amount)
      
      if (withdrawDate === today) {
        todayTotal += amount
      }
      cumulativeTotal += amount
    })

    // Calculate from coupon redemptions
    const usedCoupons = JSON.parse(localStorage.getItem('usedCoupons') || '[]')
    const userCoupons = usedCoupons.filter(coupon => 
      coupon.userPhone === userData.phone
    )
    
    userCoupons.forEach(coupon => {
      const couponDate = new Date(coupon.usedDate).toDateString()
      const amount = parseFloat(coupon.bonusAmount)
      
      if (couponDate === today) {
        todayTotal += amount
      }
      cumulativeTotal += amount
    })

    // Calculate from team earnings (referral bonuses)
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]')
    const teamMembers = registeredUsers.filter(user => 
      user.referralCode === userData.phone
    )
    
    teamMembers.forEach(member => {
      const memberBalance = parseFloat(localStorage.getItem(`userBalance_${member.phone}`) || '0')
      const memberWithdrawals = JSON.parse(localStorage.getItem(`withdrawHistory_${member.phone}`) || '[]')
      const memberTotalWithdrawals = memberWithdrawals.reduce((sum, withdraw) => 
        sum + (withdraw.status === 'approved' ? parseFloat(withdraw.amount) : 0), 0
      )
      
      // Calculate 5% commission from team member's total activity
      const memberTotalActivity = memberBalance + memberTotalWithdrawals
      const commission = memberTotalActivity * 0.05
      
      cumulativeTotal += commission
      
      // Check if team member was active today
      const todayActivity = memberWithdrawals.filter(withdraw => 
        new Date(withdraw.date).toDateString() === today && withdraw.status === 'approved'
      )
      if (todayActivity.length > 0) {
        todayTotal += commission * 0.1 // 10% of daily commission
      }
    })

    setTodayIncome(todayTotal)
    setCumulativeIncome(cumulativeTotal)
  }
  
  const nextCarSlide = () => {
    setCurrentCarSlide((prev) => (prev + 1) % totalCarSlides)
  }

  const previousCarSlide = () => {
    setCurrentCarSlide((prev) => (prev - 1 + totalCarSlides) % totalCarSlides)
  }

  const handleRecharge = () => {
    setShowRechargeModal(true)
  }

  const handleWithdraw = () => {
    setShowWithdrawModal(true)
  }

  const handleTelegram = () => {
    // Add your telegram functionality here
    alert('Opening Telegram support...')
  }
  
  const handleCoupon = () => {
    // Refresh balance before opening modal
    if (userData) {
      const balance = parseFloat(localStorage.getItem(`userBalance_${userData.phone}`) || '0')
      setUserBalance(balance)
      console.log('Current balance:', balance) // Debug log
    }
    setShowCouponModal(true)
  }

  const handleRechargeSubmit = () => {
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    const amount = parseFloat(rechargeAmount)
    const rechargeRequest = {
      id: Date.now(),
      userId: userData?.phone || 'unknown',
      userName: userData?.name || 'Unknown User',
      amount: amount,
      status: 'pending',
      date: new Date().toISOString(),
      paymentMethod: selectedPaymentMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash',
      paymentNumber: paymentDetails[selectedPaymentMethod].number,
      paymentAccountName: paymentDetails[selectedPaymentMethod].accountName,
      transactionId: `RCH${Date.now()}`
    }

    // Add to admin pending requests
    const pendingRequests = JSON.parse(localStorage.getItem('pendingRechargeRequests') || '[]')
    pendingRequests.push(rechargeRequest)
    localStorage.setItem('pendingRechargeRequests', JSON.stringify(pendingRequests))

    alert(`Recharge request submitted for $${amount}. Admin will approve your payment.`)
    setRechargeAmount('')
    setShowRechargeModal(false)
  }

  const handleWithdrawSubmit = () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    const amount = parseFloat(withdrawAmount)
    const withdrawRequest = {
      id: Date.now(),
      userId: userData?.phone || 'unknown',
      userName: userData?.name || 'Unknown User',
      amount: amount,
      status: 'pending',
      date: new Date().toISOString(),
      withdrawalMethod: selectedWithdrawMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash',
      withdrawalNumber: paymentDetails[selectedWithdrawMethod].number,
      withdrawalAccountName: withdrawAccountName,
      transactionId: `WTH${Date.now()}`
    }

    // Add to admin pending requests
    const pendingRequests = JSON.parse(localStorage.getItem('pendingWithdrawRequests') || '[]')
    pendingRequests.push(withdrawRequest)
    localStorage.setItem('pendingWithdrawRequests', JSON.stringify(pendingRequests))

    alert(`Withdrawal request submitted for $${amount}. Admin will process your withdrawal.`)
    setWithdrawAmount('')
    setWithdrawAccountName('')
    setShowWithdrawModal(false)
  }

  const handleNavigation = (page) => {
    setActiveNav(page)
    switch(page) {
      case 'home':
        // Already on home
        break
      case 'invest':
        router.push('/invest')
        break
      case 'team':
        router.push('/team')
        break
      case 'profile':
        router.push('/profile')
        break
    }
  }

  const handleCouponRedeem = () => {
    if (!couponCode.trim()) {
      alert('Please enter a coupon code')
      return
    }

    if (!userData) {
      alert('Please log in to redeem coupons')
      return
    }

    // Get available coupons from localStorage
    const availableCoupons = JSON.parse(localStorage.getItem('availableCoupons') || '[]')
    const coupon = availableCoupons.find(c => c.code.toLowerCase() === couponCode.toLowerCase())

    if (!coupon) {
      alert('Invalid coupon code')
      return
    }

    if (!coupon.isActive) {
      alert('This coupon code is inactive')
      return
    }

    // Check if user has already used this coupon
    const usedCoupons = JSON.parse(localStorage.getItem('usedCoupons') || '[]')
    const hasUsed = usedCoupons.some(used => 
      used.couponCode === coupon.code && used.userPhone === userData.phone
    )

    if (hasUsed) {
      alert('You have already used this coupon code')
      return
    }

    // Add bonus to user balance
    const currentBalance = parseFloat(localStorage.getItem(`userBalance_${userData.phone}`) || '0')
    const newBalance = currentBalance + coupon.bonusAmount
    localStorage.setItem(`userBalance_${userData.phone}`, newBalance.toString())
    setUserBalance(newBalance)
    
    console.log('Coupon redeemed:', {
      code: coupon.code,
      bonusAmount: coupon.bonusAmount,
      oldBalance: currentBalance,
      newBalance: newBalance,
      userPhone: userData.phone
    })

    // Mark coupon as used
    const usedCoupon = {
      couponCode: coupon.code,
      userPhone: userData.phone,
      userName: userData.name,
      bonusAmount: coupon.bonusAmount,
      usedDate: new Date().toISOString()
    }
    usedCoupons.push(usedCoupon)
    localStorage.setItem('usedCoupons', JSON.stringify(usedCoupons))

    // Update coupon usage count
    coupon.usageCount = (coupon.usageCount || 0) + 1
    if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
      coupon.isActive = false
    }
    localStorage.setItem('availableCoupons', JSON.stringify(availableCoupons))

    alert(`🎉 Coupon redeemed successfully! ${coupon.bonusAmount} Rs added to your balance.`)
    setCouponCode('')
    setShowCouponModal(false)
    
    // Refresh balance and income after successful redemption
    if (userData) {
      const updatedBalance = parseFloat(localStorage.getItem(`userBalance_${userData.phone}`) || '0')
      setUserBalance(updatedBalance)
      calculateIncome()
    }
  }

  return (
    <>
      <div className="w-full min-h-screen">
        
        
        {/* Honda Civic Investment Carousel */}
        <div className="w-full h-[300px]">
          <div className="relative w-full h-full overflow-hidden">
            {/* Car Images */}
            <div className="absolute inset-0 flex transition-transform duration-500 ease-in-out" 
              style={{ transform: `translateX(-${currentCarSlide * 100}%)` }}>
              <div className="min-w-full relative">
                <img 
                  src="/car1.jpeg" 
                  alt="Honda Civic Type R" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-full relative">
                <img 
                  src="/car2.jpeg" 
                  alt="Honda Civic Sedan" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-full relative">
                <img 
                  src="/car3.jpeg" 
                  alt="Honda Civic Hatchback" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-full relative">
                <img 
                  src="/car4.jpeg" 
                  alt="Honda Civic Sport" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            {/* Navigation Arrows */}
            <button 
              onClick={previousCarSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button 
              onClick={nextCarSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {[...Array(totalCarSlides)].map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setCurrentCarSlide(i)}
                  className={`w-2 h-2 rounded-full ${currentCarSlide === i ? 'bg-white' : 'bg-white/50'}`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Main Content Area with Transparent Background */}
        <div className="flex-1 bg-transparent relative">
          {/* Subtle Pattern Overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-20 h-20 bg-purple-300 rounded-full"></div>
            <div className="absolute top-20 right-20 w-16 h-16 bg-purple-200 rounded-full"></div>
            <div className="absolute bottom-20 left-20 w-12 h-12 bg-purple-300 rounded-full"></div>
            <div className="absolute bottom-10 right-10 w-24 h-24 bg-purple-200 rounded-full"></div>
          </div>
          
          <div className="relative z-10 px-4 py-6">
            {/* Action Buttons */}
            <div className="bg-white rounded-lg p-2 mb-8" style={{ boxShadow: 'rgba(17, 17, 26, 0.1) 0px 4px 16px, rgba(17, 17, 26, 0.1) 0px 8px 24px, rgba(17, 17, 26, 0.1) 0px 16px 56px' }}>
              <div className="flex justify-between gap-3 overflow-x-auto">
                        <div 
                onClick={handleRecharge}
                className="flex-1 bg-purple-600 p-1 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col items-center cursor-pointer overflow-hidden"
              >
                <div className="w-full p-1 flex justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="p-2 text-center">
                  <span className="font-medium text-white">Recharge</span>
                </div>
              </div>
            
                        <div 
                onClick={handleWithdraw}
                className="flex-1 bg-purple-600 p-1 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col items-center cursor-pointer overflow-hidden"
              >
                <div className="w-full p-1 flex justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="p-2 text-center">
                  <span className="font-medium text-white">Withdraw</span>
                </div>
              </div>
            
                        <div 
                onClick={handleTelegram}
                className="flex-1 bg-purple-600 p-1 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col items-center cursor-pointer overflow-hidden"
              >
                <div className="w-full p-1 flex justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7zM8 12h8m-4-4v8" />
                  </svg>
                </div>
                <div className="p-2 text-center">
                  <span className="font-medium text-white">Help</span>
                </div>
              </div>
            
              <div 
                onClick={handleCoupon}
                className="flex-1 bg-purple-600 p-1 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col items-center cursor-pointer overflow-hidden"
              >
                <div className="w-full p-1 flex justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <div className="p-2 text-center">
                  <span className="font-medium text-white">Redeem</span>
                </div>
              </div>
          </div>
            </div>
        
                  {/* Live Withdrawals */}
          <div className="bg-white rounded-full mb-8" style={{ boxShadow: 'rgba(17, 17, 26, 0.1) 0px 4px 16px, rgba(17, 17, 26, 0.1) 0px 8px 24px, rgba(17, 17, 26, 0.1) 0px 16px 56px' }}>
            <div className="flex items-center p-2">
              <div className="bg-purple-500 rounded-full p-2 mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <div className="overflow-hidden flex-1">
                <div className="animate-scroll whitespace-nowrap text-black font-medium">
                  <span className="mr-8">✅ Rs 798 0335****9054 Withdraw Success</span>
                  <span className="mr-8">✅ Rs 1,250 0300****567 Withdraw Success</span>
                  <span className="mr-8">✅ Rs 850 0301****234 Withdraw Success</span>
                  <span className="mr-8">✅ Rs 2,100 0302****789 Withdraw Success</span>
                  <span className="mr-8">✅ Rs 798 0335****9054 Withdraw Success</span>
                  <span className="mr-8">✅ Rs 1,250 0300****567 Withdraw Success</span>
                  <span className="mr-8">✅ Rs 850 0301****234 Withdraw Success</span>
                  <span className="mr-8">✅ Rs 2,100 0302****789 Withdraw Success </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Account Balance Cards */}
          <div className="flex gap-4 mb-6">
            {/* Account Balance - Large Card */}
            <div className="flex-1 bg-white rounded-lg p-4 text-purple-900 relative overflow-hidden" style={{ boxShadow: 'rgba(17, 17, 26, 0.1) 0px 4px 16px, rgba(17, 17, 26, 0.1) 0px 8px 24px, rgba(17, 17, 26, 0.1) 0px 16px 56px' }}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200 rounded-full -translate-y-10 translate-x-10 opacity-30"></div>
              <div className="relative z-10">
                <p className="text-sm font-medium opacity-90">Account balance</p>
                <p className="text-2xl font-bold mt-1">Rs{userBalance.toFixed(2)}</p>
              </div>
            </div>
            
            {/* Right Side Cards */}
            <div className="flex flex-col gap-4 w-1/3">
              {/* Today Income */}
              <div className="bg-white rounded-lg p-3 text-purple-900 relative overflow-hidden" style={{ boxShadow: 'rgba(17, 17, 26, 0.1) 0px 4px 16px, rgba(17, 17, 26, 0.1) 0px 8px 24px, rgba(17, 17, 26, 0.1) 0px 16px 56px' }}>
                <div className="absolute top-0 right-0 w-12 h-12 bg-purple-200 rounded-full -translate-y-6 translate-x-6 opacity-30"></div>
                <div className="relative z-10">
                  <p className="text-xs font-medium opacity-90">Today income</p>
                  <p className="text-lg font-bold mt-1">Rs{todayIncome.toFixed(2)}</p>
                </div>
              </div>
              
              {/* Cumulative Income */}
              <div className="bg-white rounded-lg p-3 text-purple-900 relative overflow-hidden" style={{ boxShadow: 'rgba(17, 17, 26, 0.1) 0px 4px 16px, rgba(17, 17, 26, 0.1) 0px 8px 24px, rgba(17, 17, 26, 0.1) 0px 16px 56px' }}>
                <div className="absolute top-0 right-0 w-12 h-12 bg-purple-200 rounded-full -translate-y-6 translate-x-6 opacity-30"></div>
                <div className="relative z-10">
                  <p className="text-xs font-medium opacity-90">Cumulative income</p>
                  <p className="text-lg font-bold mt-1">Rs{cumulativeIncome.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
          
                  {/* Your Current Plan Section */}
        <div className="bg-white rounded-lg p-6 mb-6" style={{ boxShadow: 'rgba(17, 17, 26, 0.1) 0px 4px 16px, rgba(17, 17, 26, 0.1) 0px 8px 24px, rgba(17, 17, 26, 0.1) 0px 16px 56px' }}>
            <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Your Current Plan
            </h3>
            
            {currentPlan ? (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                {/* Plan Image */}
                <div className="relative h-32 mb-4 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                  <img 
                    src={currentPlan.image} 
                    alt={currentPlan.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-bold text-purple-900">{currentPlan.name}</h4>
                  <div className="flex items-center space-x-2">
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                      Active
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      getRemainingDays(currentPlan) <= 7 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {getRemainingDays(currentPlan)} days left
                    </span>
                  </div>
                </div>
                {getRemainingDays(currentPlan) <= 7 && getRemainingDays(currentPlan) > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <p className="text-sm text-yellow-800">
                        <strong>Plan Expiring Soon!</strong> Your plan will expire in {getRemainingDays(currentPlan)} days. Consider renewing or investing in a new plan.
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-gray-600 text-sm mb-3">{currentPlan.description}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500">Investment Amount</p>
                    <p className="font-bold text-lg text-purple-900">{currentPlan.investAmount}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500">Daily Income</p>
                    <p className="font-bold text-lg text-green-600">{currentPlan.dailyIncome}</p>
                  </div>
                </div>
                <div className="mt-3 bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-500">Validity Period</p>
                  <p className="font-bold text-lg text-purple-900">{currentPlan.validity}</p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center border-2 border-dashed border-gray-300">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h4 className="text-lg font-medium text-gray-600 mb-2">No Current Plan</h4>
                <p className="text-gray-500 text-sm mb-4">You haven't purchased any investment plan yet.</p>
                <button 
                  onClick={() => handleNavigation('invest')}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Browse Plans
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
        
        {/* Bottom Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 shadow-lg">
          <div className="flex justify-between items-center">
            <button 
              onClick={() => handleNavigation('home')}
              className={`flex flex-col items-center ${activeNav === 'home' ? 'text-purple-600' : 'text-gray-500'}`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs">Home</span>
            </button>
            
            <button 
              onClick={() => handleNavigation('invest')}
              className={`flex flex-col items-center ${activeNav === 'invest' ? 'text-purple-600' : 'text-gray-500'}`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xs">Invest</span>
            </button>
            
            <button 
              onClick={() => handleNavigation('team')}
              className={`flex flex-col items-center ${activeNav === 'team' ? 'text-purple-600' : 'text-gray-500'}`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs">Team</span>
            </button>
            
            <button 
              onClick={() => handleNavigation('profile')}
              className={`flex flex-col items-center ${activeNav === 'profile' ? 'text-purple-600' : 'text-gray-500'}`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs">Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Recharge Account</h3>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount ($)</label>
              <input
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                placeholder="Enter amount"
                min="1"
                step="0.01"
              />
            </div>

            {/* Payment Method Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('easypaisa')}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    selectedPaymentMethod === 'easypaisa'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-lg font-semibold">EasyPaisa</div>
                  <div className="text-sm text-gray-600">Send to: {paymentDetails.easypaisa.number}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('jazzcash')}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    selectedPaymentMethod === 'jazzcash'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-lg font-semibold">JazzCash</div>
                  <div className="text-sm text-gray-600">Send to: {paymentDetails.jazzcash.number}</div>
                </button>
              </div>
            </div>

            {/* Payment Details */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Account Name:</span>
                  <span className="text-sm font-medium text-gray-800">
                    {paymentDetails[selectedPaymentMethod].accountName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Account Number:</span>
                  <span className="text-sm font-medium text-gray-800">
                    {paymentDetails[selectedPaymentMethod].number}
                  </span>
                </div>
              </div>
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                💡 Send the exact amount to the account above. Include your phone number in the payment note.
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleRechargeSubmit}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Submit Request
              </button>
              <button
                onClick={() => setShowRechargeModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Withdraw Funds</h3>
            
            {/* Available Balance */}
            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <span className="font-semibold">Available Balance:</span> $100.00
              </p>
            </div>

            {/* Amount Input */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Amount ($)</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                placeholder="Enter amount"
                min="1"
                step="0.01"
              />
            </div>

            {/* Withdrawal Method Selection */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWithdrawMethod('easypaisa')}
                  className={`p-2 border rounded-lg text-center transition-colors ${
                    selectedWithdrawMethod === 'easypaisa'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-base font-semibold">EasyPaisa</div>
                  <div className="text-xs text-gray-600">Receive to: {paymentDetails.easypaisa.number}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWithdrawMethod('jazzcash')}
                  className={`p-2 border rounded-lg text-center transition-colors ${
                    selectedWithdrawMethod === 'jazzcash'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                }`}
                >
                  <div className="text-base font-semibold">JazzCash</div>
                  <div className="text-xs text-gray-600">Receive to: {paymentDetails.jazzcash.number}</div>
                </button>
              </div>
            </div>

            {/* Account Details */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
              <input
                type="text"
                value={paymentDetails[selectedWithdrawMethod].number}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                placeholder="Account number"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">This is your registered account number</p>
            </div>

            {/* Account Holder Name */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
              <input
                type="text"
                value={withdrawAccountName}
                onChange={(e) => setWithdrawAccountName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                placeholder="Enter account holder name"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter the name registered with your account</p>
            </div>

            {/* Withdrawal Info */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-1">Withdrawal Information:</h4>
              <ul className="text-xs text-blue-700 space-y-0.5">
                <li>• Amount will be sent to your {selectedWithdrawMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'} account</li>
                <li>• Processing time: 24-48 hours</li>
                <li>• Make sure account details are correct</li>
                <li>• Admin will verify and process your withdrawal</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleWithdrawSubmit}
                disabled={!withdrawAccountName.trim()}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Submit Withdrawal
              </button>
              <button
                onClick={() => {
                  setShowWithdrawModal(false)
                  setWithdrawAccountName('')
                  setWithdrawAmount('')
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Redeem Coupon</h3>
              <p className="text-gray-600 text-sm">Enter your coupon code to get bonus balance!</p>
            </div>

            {/* Current Balance */}
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <span className="font-semibold">Current Balance:</span> Rs{userBalance.toFixed(2)}
              </p>
            </div>

            {/* Coupon Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Coupon Code</label>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                placeholder="Enter coupon code"
                maxLength="20"
              />
              <p className="text-xs text-gray-500 mt-1">Enter the coupon code provided by admin</p>
            </div>

            {/* How it works */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">💡 How it works:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Enter the coupon code provided by admin</li>
                <li>• Bonus amount will be added to your balance</li>
                <li>• Each coupon can only be used once per user</li>
                <li>• Invalid or expired codes will be rejected</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCouponRedeem}
                disabled={!couponCode.trim()}
                className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Redeem Coupon
              </button>
              <button
                onClick={() => {
                  setShowCouponModal(false)
                  setCouponCode('')
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        .animate-scroll {
          animation: scroll 15s linear infinite;
        }
      `}</style>
    </>
  )
}