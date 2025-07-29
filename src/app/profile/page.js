'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const router = useRouter()
  const [activeNav, setActiveNav] = useState('profile')
  const [userName, setUserName] = useState('John Doe')
  const [userPhone, setUserPhone] = useState('+92 300 ****567')
  const [userData, setUserData] = useState(null)
  const [balance, setBalance] = useState(0)
  const [showRechargeModal, setShowRechargeModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [rechargeAmount, setRechargeAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [rechargeHistory, setRechargeHistory] = useState([])
  const [withdrawHistory, setWithdrawHistory] = useState([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('easypaisa')
  const [selectedWithdrawMethod, setSelectedWithdrawMethod] = useState('easypaisa')
  const [paymentDetails, setPaymentDetails] = useState({
    easypaisa: { number: '', accountName: '' },
    jazzcash: { number: '', accountName: '' }
  })
  const [withdrawAccountName, setWithdrawAccountName] = useState('')
  
  // Income tracking states
  const [todayIncome, setTodayIncome] = useState(0)
  const [cumulativeIncome, setCumulativeIncome] = useState(0)
  const [teamSize, setTeamSize] = useState(0)
  const [investments, setInvestments] = useState([])

  // Load user data on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserData = localStorage.getItem('userData')
      if (storedUserData) {
        const user = JSON.parse(storedUserData)
        setUserName(user.name || 'John Doe')
        setUserPhone(user.phone || '+92 300 ****567')
        setUserData(user)
        
        // Load user balance and history
        const userBalance = localStorage.getItem(`userBalance_${user.phone}`) || '0'
        setBalance(parseFloat(userBalance))
      }
      
      const storedRechargeHistory = localStorage.getItem('rechargeHistory') || '[]'
      setRechargeHistory(JSON.parse(storedRechargeHistory))
      
      const storedWithdrawHistory = localStorage.getItem('withdrawHistory') || '[]'
      setWithdrawHistory(JSON.parse(storedWithdrawHistory))
      
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
    }
  }, [])

  // Refresh balance when component mounts or userData changes
  useEffect(() => {
    if (userData) {
      const userBalance = localStorage.getItem(`userBalance_${userData.phone}`) || '0'
      setBalance(parseFloat(userBalance))
      calculateIncome()
    }
  }, [userData])

  // Recalculate income when history data changes
  useEffect(() => {
    if (userData && rechargeHistory.length > 0) {
      calculateIncome()
    }
  }, [rechargeHistory, withdrawHistory, userData])

  // Refresh all data when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshAllData()
    }, 100) // Small delay to ensure all data is loaded
    
    return () => clearTimeout(timer)
  }, [userData])

  // Refresh all data
  const refreshAllData = () => {
    if (userData) {
      // Refresh balance
      const userBalance = localStorage.getItem(`userBalance_${userData.phone}`) || '0'
      setBalance(parseFloat(userBalance))
      
      // Refresh history
      const storedRechargeHistory = localStorage.getItem('rechargeHistory') || '[]'
      setRechargeHistory(JSON.parse(storedRechargeHistory))
      
      const storedWithdrawHistory = localStorage.getItem('withdrawHistory') || '[]'
      setWithdrawHistory(JSON.parse(storedWithdrawHistory))
      
      // Load investments
      const storedInvestments = localStorage.getItem(`investmentHistory_${userData.phone}`) || '[]'
      setInvestments(JSON.parse(storedInvestments))
      
      // Calculate income
      calculateIncome()
    }
  }

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
    setTeamSize(teamMembers.length)
  }

  const userInitial = userName.charAt(0).toUpperCase()

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('isLoggedIn')
      localStorage.removeItem('userData')
      router.push('/login')
    }
  }

  const handleRecharge = () => {
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    const amount = parseFloat(rechargeAmount)
    const rechargeRequest = {
      id: Date.now(),
      userId: userData?.phone || userPhone,
      userName: userName,
      amount: amount,
      status: 'pending',
      date: new Date().toISOString(),
      paymentMethod: selectedPaymentMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash',
      paymentNumber: paymentDetails[selectedPaymentMethod].number,
      paymentAccountName: paymentDetails[selectedPaymentMethod].accountName,
      transactionId: `RCH${Date.now()}`
    }

    // Add to recharge history
    const updatedRechargeHistory = [...rechargeHistory, rechargeRequest]
    setRechargeHistory(updatedRechargeHistory)
    localStorage.setItem('rechargeHistory', JSON.stringify(updatedRechargeHistory))

    // Add to admin pending requests
    const pendingRequests = JSON.parse(localStorage.getItem('pendingRechargeRequests') || '[]')
    pendingRequests.push(rechargeRequest)
    localStorage.setItem('pendingRechargeRequests', JSON.stringify(pendingRequests))

    alert(`Recharge request submitted for $${amount}. Admin will approve your payment.`)
    setRechargeAmount('')
    setShowRechargeModal(false)
  }

  const handleWithdraw = () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    const amount = parseFloat(withdrawAmount)
    if (amount > balance) {
      alert('Insufficient balance')
      return
    }

    const withdrawRequest = {
      id: Date.now(),
      userId: userData?.phone || userPhone,
      userName: userName,
      amount: amount,
      status: 'pending',
      date: new Date().toISOString(),
      withdrawalMethod: selectedWithdrawMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash',
      withdrawalNumber: paymentDetails[selectedWithdrawMethod].number,
      withdrawalAccountName: withdrawAccountName,
      transactionId: `WTH${Date.now()}`
    }

    // Add to withdraw history
    const updatedWithdrawHistory = [...withdrawHistory, withdrawRequest]
    setWithdrawHistory(updatedWithdrawHistory)
    localStorage.setItem('withdrawHistory', JSON.stringify(updatedWithdrawHistory))

    // Add to admin pending requests
    const pendingRequests = JSON.parse(localStorage.getItem('pendingWithdrawRequests') || '[]')
    pendingRequests.push(withdrawRequest)
    localStorage.setItem('pendingWithdrawRequests', JSON.stringify(pendingRequests))

    // Deduct from balance immediately (will be reversed if admin rejects)
    const newBalance = balance - amount
    setBalance(newBalance)
    localStorage.setItem(`userBalance_${userData?.phone || userPhone}`, newBalance.toString())

    alert(`Withdrawal request submitted for $${amount}. Admin will process your withdrawal.`)
    setWithdrawAmount('')
    setShowWithdrawModal(false)
  }

  const handleNavigation = (page) => {
    setActiveNav(page)
    switch(page) {
      case 'home':
        router.push('/')
        break
      case 'invest':
        router.push('/invest')
        break
      case 'investment':
        router.push('/invest')
        break
      case 'team':
        router.push('/team')
        break
      case 'profile':
        // Already on profile
        break
    }
  }

  return (
    <>
      <div className="w-full min-h-screen">
        <div className="p-4">
                {/* Profile Header Card */}
        <div className="bg-white rounded-2xl p-6 mb-6 relative overflow-hidden" style={{ boxShadow: 'rgba(17, 17, 26, 0.1) 0px 4px 16px, rgba(17, 17, 26, 0.1) 0px 8px 24px, rgba(17, 17, 26, 0.1) 0px 16px 56px' }}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200 rounded-full -translate-y-10 translate-x-10 opacity-20"></div>
          <div className="relative z-10 text-center">
            <div className="w-20 h-20 bg-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">{userInitial}</span>
            </div>
            <h2 className="text-2xl font-bold text-purple-900 mb-3">{userName}</h2>
            <p className="text-gray-600 mb-3">{userPhone}</p>
            {userData?.referralCode && (
              <p className="text-sm text-gray-500 mb-3">Referred by: {userData.referralCode}</p>
            )}
            <div className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium mb-6">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Premium Member
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="bg-purple-100 rounded-xl p-4 mb-2">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">Rs{balance.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Balance</p>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 rounded-xl p-4 mb-2">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">{investments.length}</p>
                </div>
                <p className="text-sm text-gray-700">Investments</p>
              </div>
              <div className="text-center">
                <div className="bg-purple-600 rounded-xl p-4 mb-2">
                  <div className="w-8 h-8 bg-purple-700 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-white">Rs{balance.toFixed(2)}</p>
                </div>
                <p className="text-sm text-gray-700">Total Balance</p>
              </div>
            </div>
            
            {/* Second Row - Team Size */}
            <div className="grid grid-cols-1 gap-4 mt-4">
              <div className="text-center">
                <div className="bg-purple-100 rounded-xl p-4 mb-2">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">{teamSize}</p>
                </div>
                <p className="text-sm text-gray-700">Team Size</p>
              </div>
            </div>
          </div>
        </div>



        {/* Financial Overview Section */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            Financial Overview
          </h3>
          
          {/* Account Balance Cards - Like Home Page */}
          <div className="flex gap-4 mb-4">
            {/* Account Balance - Large Card */}
            <div className="flex-1 bg-white rounded-lg p-4 text-purple-900 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200 rounded-full -translate-y-10 translate-x-10 opacity-30"></div>
              <div className="relative z-10">
                <p className="text-sm font-medium opacity-90">Account balance</p>
                <p className="text-2xl font-bold mt-1">Rs{balance.toFixed(2)}</p>
              </div>
            </div>
            
            {/* Right Side Cards */}
            <div className="flex flex-col gap-4 w-1/3">
              {/* Today Income */}
              <div className="bg-white rounded-lg p-3 text-purple-900 relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 w-12 h-12 bg-purple-200 rounded-full -translate-y-6 translate-x-6 opacity-30"></div>
                <div className="relative z-10">
                  <p className="text-xs font-medium opacity-90">Today income</p>
                  <p className="text-lg font-bold mt-1">Rs{todayIncome.toFixed(2)}</p>
                </div>
              </div>
              
              {/* Cumulative Income */}
              <div className="bg-white rounded-lg p-3 text-purple-900 relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 w-12 h-12 bg-purple-200 rounded-full -translate-y-6 translate-x-6 opacity-30"></div>
                <div className="relative z-10">
                  <p className="text-xs font-medium opacity-90">Cumulative income</p>
                  <p className="text-lg font-bold mt-1">Rs{cumulativeIncome.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Balance Cards - 4th Card */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-purple-900 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-200 rounded-full -translate-y-8 translate-x-8 opacity-30"></div>
              <div className="relative z-10">
                <p className="text-sm font-medium opacity-90">Total Recharge</p>
                <p className="text-xl font-bold mt-1">Rs{rechargeHistory.filter(req => req.userId === userData?.phone && req.status === 'approved').reduce((sum, req) => sum + parseFloat(req.amount), 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 text-purple-900 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-200 rounded-full -translate-y-8 translate-x-8 opacity-30"></div>
              <div className="relative z-10">
                <p className="text-sm font-medium opacity-90">Total Withdraw</p>
                <p className="text-xl font-bold mt-1">Rs{withdrawHistory.filter(req => req.userId === userData?.phone && req.status === 'approved').reduce((sum, req) => sum + parseFloat(req.amount), 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex justify-center gap-8">
              {/* Recharge Button */}
              <div className="flex flex-col items-center" onClick={() => setShowRechargeModal(true)}>
                <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center mb-2 hover:bg-purple-700 transition-colors cursor-pointer shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <span className="text-purple-900 text-sm font-medium">Recharge</span>
              </div>
              
              {/* Withdraw Button */}
              <div className="flex flex-col items-center" onClick={() => setShowWithdrawModal(true)}>
                <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center mb-2 hover:bg-purple-700 transition-colors cursor-pointer shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <span className="text-purple-900 text-sm font-medium">Withdraw</span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-lg p-6 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-12 h-12 bg-purple-200 rounded-full -translate-y-6 translate-x-6 opacity-20"></div>
          <div className="relative z-10">
            <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center">
              <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </h3>
            
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-purple-50 transition-colors">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-gray-700">Change Password</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-purple-50 transition-colors">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM4 5h6V4a1 1 0 00-1-1H5a1 1 0 00-1 1v1zm0 0h6m0 0H4m6 0v6" />
                  </svg>
                  <span className="text-gray-700">Notifications</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-purple-50 transition-colors">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700">Help & Support</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-red-50 transition-colors"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-red-600">Logout</span>
                </div>
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
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
                onClick={handleRecharge}
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
                <span className="font-semibold">Available Balance:</span> ${balance.toFixed(2)}
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
                max={balance}
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
                onClick={handleWithdraw}
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
    </div>
    </>
  )
} 