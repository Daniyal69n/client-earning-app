'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotification } from './context/NotificationContext'
import { updateUserBalance, getCurrentUser } from '../lib/api'

export default function Page() {
  const router = useRouter()
  const { showSuccess, showError, showWarning, showInfo } = useNotification()
  const [currentCarSlide, setCurrentCarSlide] = useState(0)
  const [activeNav, setActiveNav] = useState('home')
  const [userName] = useState('John Doe') // You can make this dynamic later
  const [currentPlans, setCurrentPlans] = useState([]) // Store user's current plan
  
  // Modal states
  const [showRechargeModal, setShowRechargeModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [rechargeAmount, setRechargeAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('easypaisa')
  const [selectedWithdrawMethod, setSelectedWithdrawMethod] = useState('easypaisa')
  const [withdrawAccountName, setWithdrawAccountName] = useState('')
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState('')
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
  const [earnBalance, setEarnBalance] = useState(0)
  const [totalRecharge, setTotalRecharge] = useState(0)
  const [referralCommission, setReferralCommission] = useState(0)
  const [totalCommissionEarned, setTotalCommissionEarned] = useState(0)
  

  
  // Remaining days state
  const [remainingDays, setRemainingDays] = useState(0)

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
  
  // Parse investment amount from string (e.g., "$5,000" to 5000)
  const parseInvestmentAmount = (amountString) => {
    if (typeof amountString === 'number') return amountString
    if (!amountString) return 0
    
    // Remove currency symbols and commas, then parse
    const cleanAmount = amountString.replace(/[$,₹Rs]/g, '').replace(/,/g, '')
    return parseFloat(cleanAmount) || 0
  }

  // Load user data and current plan from database
  const loadUserData = async () => {
    try {
      console.log('loadUserData called - fetching user data...');
      const user = await getCurrentUser(true); // Force refresh from database
      console.log('User data fetched:', user);
      
      if (user) {
        setUserData(user);
        setUserBalance(user.balance || 0);
        setEarnBalance(user.earnBalance || 0);
        setTotalRecharge(user.totalRecharge || 0);
        setReferralCommission(user.referralCommission || 0);
        setTotalCommissionEarned(user.totalCommissionEarned || 0);
        console.log('User data set in state:', {
          balance: user.balance || 0,
          earnBalance: user.earnBalance || 0,
          totalRecharge: user.totalRecharge || 0,
          referralCommission: user.referralCommission || 0,
          totalCommissionEarned: user.totalCommissionEarned || 0
        });
        
        // Load current plans from database
        const response = await fetch(`/api/user/investments?active=true&userId=${user.phone}`)
        if (response.ok) {
          const investments = await response.json()
          if (investments.length > 0) {
            console.log('Active investments found:', investments)
            
            // Fetch the plan templates to get the images
            const planResponse = await fetch('/api/plans')
            if (planResponse.ok) {
              const plans = await planResponse.json()
              console.log('Available plans:', plans)
              
              // Process each investment and merge with plan template data
              const completePlans = investments.map(investment => {
                const planTemplate = plans.find(plan => plan.name === investment.planName)
                if (planTemplate) {
                  return {
                    ...investment,
                    image: planTemplate.image,
                    color: planTemplate.color,
                    description: planTemplate.description
                  }
                } else {
                  return investment
                }
              })
              
              console.log('Complete plans with images:', completePlans)
              setCurrentPlans(completePlans)
            } else {
              console.log('Failed to fetch plans')
              setCurrentPlans(investments)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  useEffect(() => {
    loadUserData()
  }, [])

  // Load payment details from database
  useEffect(() => {
    const loadPaymentDetails = async () => {
      try {
        const response = await fetch('/api/settings?key=paymentDetails')
        if (response.ok) {
          const data = await response.json()
          if (data && data.value) {
            setPaymentDetails(data.value)
          } else {
            // Default payment details
            const defaultPaymentDetails = {
              easypaisa: { number: '0300 1234567', accountName: 'Honda Civic Investment' },
              jazzcash: { number: '0300 7654321', accountName: 'Honda Civic Investment' }
            }
            setPaymentDetails(defaultPaymentDetails)
            // Save default to database
            await fetch('/api/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                key: 'paymentDetails',
                value: defaultPaymentDetails,
                description: 'Payment method details'
              })
            })
          }
        }
      } catch (error) {
        console.error('Error loading payment details:', error)
      }
    }

    loadPaymentDetails()
  }, [])
  
  // Daily income system - check and add daily income every 24 hours
  useEffect(() => {
    if (!userData || currentPlans.length === 0) return
    
    const checkAndAddDailyIncome = async () => {
      try {
        // Check daily income for all active plans
        for (const plan of currentPlans) {
          const response = await fetch(`/api/user/balance`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'check_daily_income',
              userId: userData.phone,
              planId: plan._id
            })
          })

          if (response.ok) {
            const result = await response.json()
            if (result.incomeAdded) {
              setEarnBalance(result.newEarnBalance)
              setUserBalance(result.newBalance)
              showSuccess(`Daily income of ${result.incomeAmount} Rs added from ${plan.planName}`)
            } else if (result.hoursRemaining) {
              // Show info about time remaining until first income
              showInfo(`First daily income will be added in ${result.hoursRemaining} hours`)
            }
          }
        }
      } catch (error) {
        console.error('Error checking daily income:', error)
      }
    }
    
    // Check immediately when component mounts
    checkAndAddDailyIncome()
    
    // Set up interval to check every hour (in case user keeps the page open)
    const dailyIncomeInterval = setInterval(checkAndAddDailyIncome, 60 * 60 * 1000) // Check every hour
    
    return () => {
      clearInterval(dailyIncomeInterval)
    }
  }, [userData, currentPlans, showSuccess])
  
  // Check if plan is expired based on validity period
  const isPlanExpired = (plan) => {
    if (!plan || !plan.investDate) return false
    
    const investDate = new Date(plan.investDate)
    const currentDate = new Date()
    
    // Parse validity period - handle both "15" and "15 days" formats
    let validityDays
    if (typeof plan.validity === 'number') {
      validityDays = plan.validity
    } else if (typeof plan.validity === 'string') {
      const validityMatch = plan.validity.match(/(\d+)\s*days?/i)
      if (validityMatch) {
        validityDays = parseInt(validityMatch[1])
      } else {
        // Try to parse as just a number
        validityDays = parseInt(plan.validity)
      }
    } else {
      return false
    }
    
    if (isNaN(validityDays)) return false
    
    const expirationDate = new Date(investDate.getTime() + (validityDays * 24 * 60 * 60 * 1000))
    
    return currentDate > expirationDate
  }

  // Get remaining days for current plan
  const getRemainingDays = (plan) => {
    if (!plan || !plan.investDate) {
      console.log('getRemainingDays: No plan or investDate')
      return 0
    }
    
    const investDate = new Date(plan.investDate)
    const currentDate = new Date()
    
    // Parse validity period - handle both "15" and "15 days" formats
    let validityDays
    if (typeof plan.validity === 'number') {
      validityDays = plan.validity
    } else if (typeof plan.validity === 'string') {
      const validityMatch = plan.validity.match(/(\d+)\s*days?/i)
      if (validityMatch) {
        validityDays = parseInt(validityMatch[1])
      } else {
        // Try to parse as just a number
        validityDays = parseInt(plan.validity)
      }
    } else {
      console.log('getRemainingDays: Invalid validity format:', plan.validity)
      return 0
    }
    
    if (isNaN(validityDays)) {
      console.log('getRemainingDays: Could not parse validity days:', plan.validity)
      return 0
    }
    
    const expirationDate = new Date(investDate.getTime() + (validityDays * 24 * 60 * 60 * 1000))
    
    const remainingTime = expirationDate.getTime() - currentDate.getTime()
    const remainingDays = Math.ceil(remainingTime / (24 * 60 * 60 * 1000))
    
    const result = Math.max(0, remainingDays)
    
    // Debug logging
    console.log('getRemainingDays calculation:', {
      planName: plan.planName,
      investDate: investDate.toISOString(),
      validity: plan.validity,
      validityDays,
      expirationDate: expirationDate.toISOString(),
      currentDate: currentDate.toISOString(),
      remainingTime,
      remainingDays: result
    })
    
    return result
  }

  // Update remaining days when current plans change
  useEffect(() => {
    if (currentPlans.length > 0) {
      // Check if any plan is expired
      const expiredPlans = currentPlans.filter(plan => isPlanExpired(plan))
      if (expiredPlans.length > 0) {
        showWarning('Some of your investment plans have expired')
      }
    } else {
      setRemainingDays(0)
    }
  }, [currentPlans, showWarning])

  // Calculate income based on current plan and team
  const calculateIncome = async () => {
    if (!userData || currentPlans.length === 0) return

    try {
      // Calculate from all active plans
      let totalDailyIncome = 0
      currentPlans.forEach(plan => {
        const dailyIncomeAmount = parseInvestmentAmount(plan.dailyIncome)
        totalDailyIncome += dailyIncomeAmount
      })
      setTodayIncome(totalDailyIncome)

      // Calculate team income (3-tier referral system)
      const response = await fetch(`/api/user/balance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'calculate_team_income',
          userId: userData.phone
        })
      })

      if (response.ok) {
        const result = await response.json()
        // Update state with new team income data
        if (result.newReferralCommission !== undefined) {
          setReferralCommission(result.newReferralCommission)
        }
        if (result.newTotalCommissionEarned !== undefined) {
          setTotalCommissionEarned(result.newTotalCommissionEarned)
        }
        if (result.newEarnBalance !== undefined) {
          setEarnBalance(result.newEarnBalance)
        }
        if (result.newBalance !== undefined) {
          setUserBalance(result.newBalance)
        }
        console.log('Team income calculated:', result)
      }
    } catch (error) {
      console.error('Error calculating income:', error)
    }
  }

  // Refresh balance when userData changes
  useEffect(() => {
    if (userData) {
      calculateIncome()
    }
  }, [userData, currentPlans])
  
  // Update remaining days display periodically
  useEffect(() => {
    if (currentPlans.length === 0) return
    
    const updateRemainingDays = () => {
      // Calculate total remaining days from all plans (for display purposes, show the minimum)
      const allRemainingDays = currentPlans.map(plan => getRemainingDays(plan))
      const minRemainingDays = Math.min(...allRemainingDays)
      setRemainingDays(minRemainingDays)
      console.log(`Plans: ${currentPlans.length}, Min Days Left: ${minRemainingDays}`)
    }
    
    // Update immediately
    updateRemainingDays()
    
    // Update every minute to keep days left accurate
    const interval = setInterval(updateRemainingDays, 60 * 1000)
    
    return () => {
      clearInterval(interval)
    }
  }, [currentPlans])

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
    showInfo('Opening Telegram support...')
  }
  
  const handleCoupon = () => {
    // Refresh balance before opening modal
    if (userData) {
      const balance = userData.balance || 0
      setUserBalance(balance)
      console.log('Current balance:', balance) // Debug log
    }
    setShowCouponModal(true)
  }

  const handleRechargeSubmit = async () => {
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      showError('Please enter a valid amount')
      return
    }

    const amount = parseFloat(rechargeAmount)
    
    // Check minimum recharge limit
    if (amount < 1000) {
      showError('Minimum recharge amount is Rs 1000')
      return
    }

    if (!userData) {
      showError('Please log in to recharge')
      return
    }

    try {
      await updateUserBalance(userData.phone, 'recharge', {
        amount: amount,
        paymentMethod: selectedPaymentMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash',
        paymentNumber: paymentDetails[selectedPaymentMethod].number,
        paymentAccountName: paymentDetails[selectedPaymentMethod].accountName,
        transactionId: transactionId.trim()
      })

      showSuccess(`Recharge request submitted for {amount}. Admin will approve your payment.`)
      setRechargeAmount('')
      setTransactionId('')
      setShowRechargeModal(false)
    } catch (error) {
      showError(error.message || 'Recharge request failed')
    }
  }

  const handleWithdrawSubmit = async () => {
    // Check if user has purchased any investment plan
    if (currentPlans.length === 0) {
      showError('❌ Withdrawal Failed!\n\nYou must purchase an investment plan before you can withdraw.\n\nPlease go to the Invest page and buy a plan first.')
      setShowWithdrawModal(false)
      return
    }

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      showError('Please enter a valid amount')
      return
    }

    const amount = parseFloat(withdrawAmount)
    
    // Check minimum withdrawal limit
    if (amount < 300) {
      showError('Minimum withdrawal amount is Rs 300')
      return
    }

    if (!userData) {
      showError('Please log in to withdraw')
      return
    }

    try {
      await updateUserBalance(userData.phone, 'withdraw', {
        amount: amount,
        withdrawalMethod: selectedWithdrawMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash',
        withdrawalNumber: withdrawAccountNumber.trim() || paymentDetails[selectedWithdrawMethod].number,
        withdrawalAccountName: withdrawAccountName
      })

      showSuccess(`Withdrawal request submitted for {amount}. Admin will process your withdrawal.`)
      setWithdrawAmount('')
      setWithdrawAccountName('')
      setShowWithdrawModal(false)
    } catch (error) {
      showError(error.message || 'Withdrawal request failed')
    }
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



  const handleCouponRedeem = async () => {
    if (!couponCode.trim()) {
      showError('Please enter a coupon code')
      return
    }

    if (!userData) {
      showError('Please log in to redeem coupons')
      return
    }

    try {
      const response = await fetch('/api/coupons/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: couponCode.trim(),
          userId: userData.phone
        })
      })

      const result = await response.json()

      if (response.ok) {
        // Update local state
        setEarnBalance(prev => prev + result.bonusAmount)
        setUserBalance(prev => prev + result.bonusAmount)
        
        showSuccess(`🎉 Coupon redeemed successfully! ${result.bonusAmount} Rs added to your earn balance and total balance.`)
        setCouponCode('')
        setShowCouponModal(false)
        
        // Refresh balance and income after successful redemption
        if (userData) {
          calculateIncome()
        }
      } else {
        showError(result.message || 'Coupon redemption failed')
      }
    } catch (error) {
      showError(error.message || 'Coupon redemption failed')
    }
  }

  const handleRefreshTeamCommission = async () => {
    if (!userData) {
      showError('Please log in to refresh team commission')
      return
    }

    try {
      showInfo('Calculating team commission...')
      
      const response = await fetch(`/api/user/balance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'calculate_team_income',
          userId: userData.phone
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Update state with new team income data
        if (result.newReferralCommission !== undefined) {
          setReferralCommission(result.newReferralCommission)
        }
        if (result.newTotalCommissionEarned !== undefined) {
          setTotalCommissionEarned(result.newTotalCommissionEarned)
        }
        if (result.newEarnBalance !== undefined) {
          setEarnBalance(result.newEarnBalance)
        }
        if (result.newBalance !== undefined) {
          setUserBalance(result.newBalance)
        }
        
        if (result.totalTeamIncome > 0) {
          showSuccess(`Team commission updated! Earned Rs${result.totalTeamIncome.toFixed(2)} from your team.`)
        } else {
          showInfo('No new team commission to add at this time.')
        }
        
        console.log('Team commission refreshed:', result)
      } else {
        showError('Failed to refresh team commission')
      }
    } catch (error) {
      console.error('Error refreshing team commission:', error)
      showError('Failed to refresh team commission')
    }
  }

  const handleTestTeamCommission = async () => {
    if (!userData) {
      showError('Please log in to test team commission')
      return
    }

    try {
      showInfo('Testing team commission calculation...')
      
      const response = await fetch('/api/test-team-commission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.phone
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Team commission test result:', result)
        showSuccess(`Test completed! Check console for details. Total potential commission: Rs${result.commissionCalculation.totalTeamIncome.toFixed(2)}`)
      } else {
        showError('Failed to test team commission')
      }
    } catch (error) {
      console.error('Error testing team commission:', error)
      showError('Failed to test team commission')
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
                className={`flex-1 p-1 rounded-lg shadow-lg transition-all duration-300 flex flex-col items-center cursor-pointer overflow-hidden ${
                  currentPlans.length > 0
                    ? 'bg-purple-600 text-white hover:shadow-xl hover:-translate-y-1' 
                    : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                }`}
              >
                <div className="w-full p-1 flex justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="p-2 text-center">
                  <span className="font-medium">Withdraw</span>
                  {currentPlans.length === 0 && (
                    <div className="text-xs mt-1 opacity-75">Plan Required</div>
                  )}
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
              {/* Earn Balance */}
              <div className="bg-white rounded-lg p-3 text-purple-900 relative overflow-hidden" style={{ boxShadow: 'rgba(17, 17, 26, 0.1) 0px 4px 16px, rgba(17, 17, 26, 0.1) 0px 8px 24px, rgba(17, 17, 26, 0.1) 0px 16px 56px' }}>
                <div className="absolute top-0 right-0 w-12 h-12 bg-purple-200 rounded-full -translate-y-6 translate-x-6 opacity-30"></div>
                <div className="relative z-10">
                  <p className="text-xs font-medium opacity-90">Earn Balance</p>
                  <p className="text-lg font-bold mt-1">Rs{earnBalance.toFixed(2)}</p>
                  <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                    <p className="text-xs text-green-700 font-medium">Team Commission</p>
                    <p className="text-sm font-bold text-green-600">Rs{referralCommission.toFixed(2)}</p>
                    <p className="text-xs text-green-600 mt-1">Available for withdrawal</p>
                  </div>
                </div>
              </div>
              

              
              {/* Total Recharge */}
              <div className="bg-white rounded-lg p-3 text-purple-900 relative overflow-hidden" style={{ boxShadow: 'rgba(17, 17, 26, 0.1) 0px 4px 16px, rgba(17, 17, 26, 0.1) 0px 8px 24px, rgba(17, 17, 26, 0.1) 0px 16px 56px' }}>
                <div className="absolute top-0 right-0 w-12 h-12 bg-purple-200 rounded-full -translate-y-6 translate-x-6 opacity-30"></div>
                <div className="relative z-10">
                  <p className="text-xs font-medium opacity-90">Total Recharge</p>
                  <p className="text-lg font-bold mt-1">Rs{totalRecharge.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Team Commission Section */}
          <div className="bg-white rounded-lg p-6 mb-6" style={{ boxShadow: 'rgba(17, 17, 26, 0.1) 0px 4px 16px, rgba(17, 17, 26, 0.1) 0px 8px 24px, rgba(17, 17, 26, 0.1) 0px 16px 56px' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-purple-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Team Commission
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleRefreshTeamCommission}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
                <button
                  onClick={() => handleNavigation('team')}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Team
                </button>
                <button
                  onClick={handleTestTeamCommission}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                  title="Test team commission calculation"
                >
                  Test
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Total Commission Earned */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Total Commission</p>
                    <p className="text-xl font-bold text-green-600">Rs{totalCommissionEarned.toFixed(2)}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Available Commission */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Available Commission</p>
                    <p className="text-xl font-bold text-blue-600">Rs{referralCommission.toFixed(2)}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Commission Rate */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 font-medium">Commission Rate</p>
                    <p className="text-xl font-bold text-purple-600">16% / 2% / 2%</p>
                    <p className="text-xs text-purple-600">Level A / B / C</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Commission Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">💡 How Team Commission Works:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-blue-700">
                <div>
                  <p className="font-medium">Level A (Direct Referrals)</p>
                  <p>• 16% commission on their activity</p>
                  <p>• Direct team members</p>
                </div>
                <div>
                  <p className="font-medium">Level B (Indirect Referrals)</p>
                  <p>• 2% commission on their activity</p>
                  <p>• Your team's referrals</p>
                </div>
                <div>
                  <p className="font-medium">Level C (Third Level)</p>
                  <p>• 2% commission on their activity</p>
                  <p>• Extended network</p>
                </div>
              </div>
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                <strong>✅ Available for Withdrawal:</strong> Your team commission is automatically added to your account balance and can be withdrawn anytime!
              </div>
            </div>
          </div>

          {/* Refresh Data Button */}
          <div className="flex justify-end mb-4 gap-2">
            <button
              onClick={loadUserData}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </button>
          </div>
          
          {/* Your Current Plans Section */}
        <div className="bg-white rounded-lg p-6 mb-6" style={{ boxShadow: 'rgba(17, 17, 26, 0.1) 0px 4px 16px, rgba(17, 17, 26, 0.1) 0px 8px 24px, rgba(17, 17, 26, 0.1) 0px 16px 56px' }}>
            <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Your Active Plans ({currentPlans.length})
            </h3>
            
            {currentPlans.length > 0 ? (
              <div className="space-y-4">
                {currentPlans.map((plan, index) => {
                  const planRemainingDays = getRemainingDays(plan)
                  return (
                    <div key={plan._id || index} className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                      {/* Plan Image */}
                      <div className="relative h-32 mb-4 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                        <img 
                          src={plan.image ? `/${plan.image}` : '/car1.jpeg'} 
                          alt={plan.planName || 'Plan Image'}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            console.log('Image failed to load:', plan.image)
                            console.log('Full image src:', e.target.src)
                            e.target.src = '/car1.jpeg'
                          }}
                          onLoad={() => {
                            console.log('Image loaded successfully:', plan.image)
                          }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-bold text-purple-900">{plan.planName}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                            Active
                          </span>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            planRemainingDays <= 7 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {planRemainingDays} days left
                          </span>
                        </div>
                      </div>
                      {planRemainingDays <= 7 && planRemainingDays > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <p className="text-sm text-yellow-800">
                              <strong>Plan Expiring Soon!</strong> Your plan will expire in {planRemainingDays} days. Consider renewing or investing in a new plan.
                            </p>
                          </div>
                        </div>
                      )}
                      <p className="text-gray-600 text-sm mb-3">{plan.description}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-500">Investment Amount</p>
                          <p className="font-bold text-lg text-purple-900">{plan.investAmount}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-500">Daily Income</p>
                          <p className="font-bold text-lg text-green-600">{plan.dailyIncome}</p>
                        </div>
                      </div>
                      <div className="mt-3 bg-white rounded-lg p-3">
                        <p className="text-xs text-gray-500">Validity Period</p>
                        <p className="font-bold text-lg text-purple-900">{plan.validity}</p>
                      </div>
                      
                      {/* Running Plan Indicator */}
                      <div className="mt-4">
                        <div className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center space-x-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>Running Plan</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center border-2 border-dashed border-gray-300">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h4 className="text-lg font-medium text-gray-600 mb-2">No Active Plans</h4>
                <p className="text-gray-500 text-sm mb-4">You haven't purchased any investment plans yet.</p>
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
        

      </div>

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Recharge Account</h3>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount (Rs)</label>
              
              {/* Predefined Amount Options */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setRechargeAmount('1200')}
                  className={`p-2 border rounded-lg text-black font-semibold text-center transition-colors ${
                    rechargeAmount === '1200'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-sm font-medium">Rs 1200</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRechargeAmount('2500')}
                  className={`p-2 border rounded-lg text-black font-semibold text-center transition-colors ${
                    rechargeAmount === '2500'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-sm font-medium">Rs 2,500</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRechargeAmount('5000')}
                  className={`p-2 border rounded-lg text-black font-semibold  text-center transition-colors ${
                    rechargeAmount === '5000'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-sm font-medium">Rs 5,000</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRechargeAmount('10000')}
                  className={`p-2 border rounded-lg text-black font-semibold text-center transition-colors ${
                    rechargeAmount === '10000'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-sm font-medium">Rs 10,000</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRechargeAmount('15000')}
                  className={`p-2 border rounded-lg text-black font-semibold  text-center transition-colors ${
                    rechargeAmount === '15000'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-sm font-medium">Rs 15,000</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRechargeAmount('20000')}
                  className={`p-2 border rounded-lg text-black font-semibold text-center transition-colors ${
                    rechargeAmount === '20000'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-sm font-medium">Rs 20,000</div>
                </button>
              </div>
              
              <input
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                placeholder="Enter custom amount (min: Rs 1,000)"
                min="1000"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum recharge amount: Rs 1,000</p>
            </div>

            {/* Transaction ID Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Transaction ID </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                placeholder="Enter transaction ID from payment app"
              />
            </div>

            {/* Payment Method Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('easypaisa')}
                  className={`p-3 border rounded-lg text-black font-semibold text-center transition-colors ${
                    selectedPaymentMethod === 'easypaisa'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-lg text-black font-semibold">EasyPaisa</div>
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
                  <div className="text-lg text-black font-semibold">JazzCash</div>
                </button>
              </div>
            </div>

            {/* Payment Details */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xl text-gray-600">Account Number:</span>
                  <span className="text-xl font-medium text-gray-800">
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
                <span className="font-semibold">Available Balance:</span> Rs{userBalance.toFixed(2)}
              </p>
              <p className="text-xs text-green-700 mt-1">
                <span className="font-medium">Includes:</span> Daily income + Team commission + Recharge amount
              </p>
            </div>

            {/* Amount Input */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Amount (Rs)</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                placeholder="Enter amount (min: Rs 300)"
                min="300"
                max={userBalance}
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum withdrawal amount: Rs 300</p>
            </div>

            {/* Withdrawal Fee Warning */}
            {withdrawAmount > 0 && (
              <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center mb-1">
                  <svg className="w-4 h-4 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm font-medium text-orange-800">Withdrawal Fee: 25%</span>
                </div>
                <div className="text-xs text-orange-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Requested Amount:</span>
                    <span>Rs{parseFloat(withdrawAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fee (25%):</span>
                    <span className="text-red-600">-Rs{(parseFloat(withdrawAmount || 0) * 0.25).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>You'll Receive:</span>
                    <span className="text-green-600">Rs{(parseFloat(withdrawAmount || 0) * 0.75).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

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
                  <div className="text-base text-black font-semibold">EasyPaisa</div>
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
                  <div className="text-base text-black font-semibold">JazzCash</div>
                </button>
              </div>
            </div>

            {/* Account Details */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
              <input
                type="text"
                value={withdrawAccountNumber}
                onChange={(e) => setWithdrawAccountNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                placeholder={paymentDetails[selectedWithdrawMethod].number || "Enter account number"}
              />
              <p className="text-xs text-gray-500 mt-1">Enter your account number or leave empty to use registered number</p>
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
                <li>• Processing time: 5-30 minutes</li>
                <li>• Make sure account details are correct</li>
                <li>• Admin will verify and process your withdrawal</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleWithdrawSubmit}
                disabled={!withdrawAccountName.trim() || (!withdrawAccountNumber.trim() && !paymentDetails[selectedWithdrawMethod].number)}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Submit Withdrawal
              </button>
              <button
                onClick={() => {
                  setShowWithdrawModal(false)
                  setWithdrawAccountName('')
                  setWithdrawAccountNumber('')
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
              <p className="text-gray-600 text-sm">Enter your coupon code to get bonus added to both earn balance and total balance!</p>
            </div>

            {/* Current Balances */}
            <div className="mb-4 space-y-2">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">Current Earn Balance:</span> Rs{earnBalance.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Current Total Balance:</span> Rs{userBalance.toFixed(2)}
                </p>
              </div>
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
                <li>• Bonus amount will be added to both earn balance and total balance</li>
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
