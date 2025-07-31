'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotification } from '../../context/NotificationContext'

export default function AdminDashboard() {
  const router = useRouter()
  const { showSuccess, showError, showWarning, showInfo } = useNotification()
  const [activeTab, setActiveTab] = useState('plans')
  const [plans, setPlans] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [showAddPlan, setShowAddPlan] = useState(false)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [uploadedImages, setUploadedImages] = useState({})
  const [pendingRechargeRequests, setPendingRechargeRequests] = useState([])
  const [pendingWithdrawRequests, setPendingWithdrawRequests] = useState([])
  const [users, setUsers] = useState([])
  const [paymentDetails, setPaymentDetails] = useState({
    easypaisa: { number: '', accountName: '' },
    jazzcash: { number: '', accountName: '' }
  })
  
  // Coupon management states
  const [coupons, setCoupons] = useState([])
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    bonusAmount: '',
    maxUsage: '',
    isActive: true,
    description: ''
  })
  const [showAddCoupon, setShowAddCoupon] = useState(false)
  const [usedCoupons, setUsedCoupons] = useState([])

  // Sample plans data - in a real app, this would come from your backend
  const [samplePlans, setSamplePlans] = useState([])

  // Load plans from database only when admin is authenticated
  useEffect(() => {
    if (isAdminLoggedIn && !isCheckingAuth) {
      const loadPlans = async () => {
        try {
          console.log('Loading plans from database...')
          const response = await fetch('/api/plans')
          if (response.ok) {
            const data = await response.json()
            console.log('Found plans:', data)
            setSamplePlans(data)
          } else {
            console.error('Failed to load plans')
            showError('Failed to load investment plans')
          }
        } catch (error) {
          console.error('Error loading plans:', error)
          showError('Error loading investment plans')
        }
      }

      loadPlans()
    }
  }, [isAdminLoggedIn, isCheckingAuth, showError])

  const [newPlan, setNewPlan] = useState({
    name: '',
    image: '',
    investAmount: '',
    dailyIncome: '',
    validity: '',
    color: 'from-purple-500 to-purple-700',
    description: '',
    isActive: true
  })

  useEffect(() => {
    console.log('Syncing samplePlans to plans:', samplePlans)
    setPlans(samplePlans)
  }, [samplePlans])

  // Debug useEffect to log plans state changes
  useEffect(() => {
    console.log('Plans state updated:', plans)
  }, [plans])

  // Check admin authentication
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const adminLoginStatus = sessionStorage.getItem('isAdminLoggedIn')
      if (adminLoginStatus === 'true') {
        setIsAdminLoggedIn(true)
      } else {
        router.push('/admin')
      }
      setIsCheckingAuth(false)
    }
  }, [router])

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout from admin panel?')) {
      sessionStorage.removeItem('isAdminLoggedIn')
      sessionStorage.removeItem('adminData')
      router.push('/admin')
    }
  }

  const handleAddPlan = async () => {
    if (!newPlan.name || !newPlan.investAmount || !newPlan.dailyIncome) {
      showError('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newPlan,
          image: newPlan.image || 'car1.jpeg'
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Plan created:', data.plan)
        setSamplePlans([...samplePlans, data.plan])
        showSuccess('Plan created successfully!')
        
        setNewPlan({
          name: '',
          image: '',
          investAmount: '',
          dailyIncome: '',
          validity: '',
          color: 'from-purple-500 to-purple-700',
          description: '',
          isActive: true
        })
        setShowAddPlan(false)
      } else {
        const error = await response.json()
        showError(error.error || 'Failed to create plan')
      }
    } catch (error) {
      console.error('Error creating plan:', error)
      showError('Error creating plan')
    }
  }

  const handleEditPlan = (plan) => {
    setEditingPlan(plan)
    setNewPlan({
      name: plan.name,
      image: plan.image,
      investAmount: plan.investAmount,
      dailyIncome: plan.dailyIncome,
      validity: plan.validity,
      color: plan.color,
      description: plan.description,
      isActive: plan.isActive
    })
    setShowAddPlan(true)
  }

  const handleUpdatePlan = async () => {
    if (!editingPlan) return

    try {
      const response = await fetch('/api/plans', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingPlan._id,
          ...newPlan
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Plan updated:', data.plan)
        setSamplePlans(samplePlans.map(plan => 
          plan._id === editingPlan._id ? data.plan : plan
        ))
        showSuccess('Plan updated successfully!')
        
        setEditingPlan(null)
        setNewPlan({
          name: '',
          image: '',
          investAmount: '',
          dailyIncome: '',
          validity: '',
          color: 'from-purple-500 to-purple-700',
          description: '',
          isActive: true
        })
        setShowAddPlan(false)
      } else {
        const error = await response.json()
        showError(error.error || 'Failed to update plan')
      }
    } catch (error) {
      console.error('Error updating plan:', error)
      showError('Error updating plan')
    }
  }

  const handleDeletePlan = async (planId) => {
    if (confirm('Are you sure you want to delete this plan?')) {
      try {
        const response = await fetch(`/api/plans?id=${planId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          setSamplePlans(samplePlans.filter(plan => plan._id !== planId))
          showSuccess('Plan deleted successfully!')
        } else {
          const error = await response.json()
          showError(error.error || 'Failed to delete plan')
        }
      } catch (error) {
        console.error('Error deleting plan:', error)
        showError('Error deleting plan')
      }
    }
  }

  const handleTogglePlanStatus = async (planId) => {
    try {
      const plan = samplePlans.find(p => p._id === planId)
      if (!plan) return

      const response = await fetch('/api/plans', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: planId,
          isActive: !plan.isActive
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSamplePlans(samplePlans.map(p => 
          p._id === planId ? data.plan : p
        ))
        showSuccess(`Plan ${data.plan.isActive ? 'activated' : 'deactivated'} successfully!`)
      } else {
        const error = await response.json()
        showError(error.error || 'Failed to toggle plan status')
      }
    } catch (error) {
      console.error('Error toggling plan status:', error)
      showError('Error toggling plan status')
    }
  }

  const handleCancelEdit = () => {
    setEditingPlan(null)
    setShowAddPlan(false)
    setNewPlan({
      name: '',
      image: '',
      investAmount: '',
      dailyIncome: '',
      validity: '',
      color: 'from-purple-500 to-purple-700',
      description: '',
      isActive: true
    })
  }

  // Handle file upload
  const handleFileUpload = (file, imageName) => {
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target.result
        setUploadedImages(prev => ({
          ...prev,
          [imageName]: imageData
        }))
        
        // Update the plan if it's being edited
        if (editingPlan && editingPlan.image === imageName) {
          setEditingPlan(prev => ({ ...prev, image: imageData }))
        }
        if (newPlan.image === imageName) {
          setNewPlan(prev => ({ ...prev, image: imageData }))
        }
        
        // Update the plans array
        setPlans(prevPlans => 
          prevPlans.map(plan => 
            plan.image === imageName 
              ? { ...plan, image: imageData }
              : plan
          )
        )
        
        // Save to localStorage
        const updatedPlans = plans.map(plan => 
          plan.image === imageName 
            ? { ...plan, image: imageData }
            : plan
        )
        localStorage.setItem('investmentPlans', JSON.stringify(updatedPlans))
      }
      reader.readAsDataURL(file)
    }
  }

  // Get image source (either uploaded or from public folder)
  const getImageSrc = (imageName) => {
    // If it's a base64 data URL, return it directly
    if (imageName && imageName.startsWith('data:')) {
      return imageName
    }
    // If it's in uploaded images, return that
    if (uploadedImages[imageName]) {
      return uploadedImages[imageName]
    }
    // Otherwise, treat it as a file name from public folder
    return `/${imageName}`
  }

  // Load pending requests and users
  // Load admin data only when authenticated
  useEffect(() => {
    if (isAdminLoggedIn && !isCheckingAuth && typeof window !== 'undefined') {
      // Load users from MongoDB API
      const loadUsers = async () => {
        try {
          const response = await fetch('/api/admin/users')
          if (response.ok) {
            const data = await response.json()
            setUsers(data.users || [])
          } else {
            console.error('Failed to load users from API')
            setUsers([])
          }
        } catch (error) {
          console.error('Error loading users:', error)
          setUsers([])
        }
      }
      
      // Load payment details from database
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
            }
          } else {
            // If API fails, use default payment details
            const defaultPaymentDetails = {
              easypaisa: { number: '0300 1234567', accountName: 'Honda Civic Investment' },
              jazzcash: { number: '0300 7654321', accountName: 'Honda Civic Investment' }
            }
            setPaymentDetails(defaultPaymentDetails)
          }
        } catch (error) {
          console.error('Error loading payment details:', error)
          // Use default payment details on error
          const defaultPaymentDetails = {
            easypaisa: { number: '0300 1234567', accountName: 'Honda Civic Investment' },
            jazzcash: { number: '0300 7654321', accountName: 'Honda Civic Investment' }
          }
          setPaymentDetails(defaultPaymentDetails)
        }
      }

      // Load coupons from database
      const loadCoupons = async () => {
        try {
          const response = await fetch('/api/coupons')
          if (response.ok) {
            const data = await response.json()
            setCoupons(data)
          } else {
            console.error('Failed to load coupons from API')
            setCoupons([])
          }
        } catch (error) {
          console.error('Error loading coupons:', error)
          setCoupons([])
        }
      }

      // Load transactions for pending requests
      const loadPendingRequests = async () => {
        try {
          const rechargeResponse = await fetch('/api/transactions?type=recharge&status=pending')
          const withdrawResponse = await fetch('/api/transactions?type=withdraw&status=pending')
          
          if (rechargeResponse.ok) {
            const rechargeData = await rechargeResponse.json()
            setPendingRechargeRequests(rechargeData)
          }
          
          if (withdrawResponse.ok) {
            const withdrawData = await withdrawResponse.json()
            setPendingWithdrawRequests(withdrawData)
          }
        } catch (error) {
          console.error('Error loading pending requests:', error)
        }
      }
      
      // Load all data
      loadUsers()
      loadPaymentDetails()
      loadCoupons()
      loadPendingRequests()
      
      // Set up periodic refresh every 30 seconds
      const refreshInterval = setInterval(() => {
        loadUsers()
        loadPaymentDetails()
        loadCoupons()
        loadPendingRequests()
      }, 30000)
      
      return () => {
        clearInterval(refreshInterval)
      }
    }
  }, [isAdminLoggedIn, isCheckingAuth])

  // Handle recharge approval
  const handleRechargeApproval = async (requestId, approved) => {
    try {
      // Call the API to update the transaction status
      const response = await fetch('/api/transactions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: requestId,
          action: approved ? 'approve' : 'reject'
        }),
      });

      if (response.ok) {
        showSuccess(`Recharge request ${approved ? 'approved' : 'rejected'} successfully`);
        // Refresh the pending requests list
        const loadPendingRequests = async () => {
          try {
            const rechargeResponse = await fetch('/api/transactions?type=recharge&status=pending')
            const withdrawResponse = await fetch('/api/transactions?type=withdraw&status=pending')
            
            if (rechargeResponse.ok) {
              const rechargeData = await rechargeResponse.json()
              setPendingRechargeRequests(rechargeData)
            }
            
            if (withdrawResponse.ok) {
              const withdrawData = await withdrawResponse.json()
              setPendingWithdrawRequests(withdrawData)
            }
          } catch (error) {
            console.error('Error loading pending requests:', error)
          }
        }
        loadPendingRequests()
      } else {
        const errorData = await response.json()
        showError(errorData.message || 'Failed to update transaction status')
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
      showError('Failed to update transaction status')
    }
  }

  // Handle withdraw approval
  const handleWithdrawApproval = async (requestId, approved) => {
    try {
      // Call the API to update the transaction status
      const response = await fetch('/api/transactions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: requestId,
          action: approved ? 'approve' : 'reject'
        }),
      });

      if (response.ok) {
        showSuccess(`Withdrawal request ${approved ? 'approved' : 'rejected'} successfully`);
        // Refresh the pending requests list
        const loadPendingRequests = async () => {
          try {
            const rechargeResponse = await fetch('/api/transactions?type=recharge&status=pending')
            const withdrawResponse = await fetch('/api/transactions?type=withdraw&status=pending')
            
            if (rechargeResponse.ok) {
              const rechargeData = await rechargeResponse.json()
              setPendingRechargeRequests(rechargeData)
            }
            
            if (withdrawResponse.ok) {
              const withdrawData = await withdrawResponse.json()
              setPendingWithdrawRequests(withdrawData)
            }
          } catch (error) {
            console.error('Error loading pending requests:', error)
          }
        }
        loadPendingRequests()
      } else {
        const errorData = await response.json()
        showError(errorData.message || 'Failed to update transaction status')
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
      showError('Failed to update transaction status')
    }
  }

  // Handle user management
  const handleBlockUser = async (userId) => {
    if (confirm('Are you sure you want to block this user?')) {
      try {
        const response = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            action: 'toggleBlock'
          }),
        })

        if (response.ok) {
          // Refresh users list
          const loadUsers = async () => {
            try {
              const userResponse = await fetch('/api/admin/users')
              if (userResponse.ok) {
                const userData = await userResponse.json()
                setUsers(userData.users || [])
              }
            } catch (error) {
              console.error('Error refreshing users:', error)
            }
          }
          loadUsers()
          
          const user = users.find(u => u.phone === userId)
          const action = user?.isBlocked ? 'unblocked' : 'blocked'
          showSuccess(`User ${userId} has been ${action}`)
        } else {
          showError('Failed to update user status')
        }
      } catch (error) {
        console.error('Error blocking user:', error)
        showError('Failed to update user status')
      }
    }
  }

  const handleDeleteUser = async (userId) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const response = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            action: 'delete'
          }),
        })

        if (response.ok) {
          // Refresh users list
          const loadUsers = async () => {
            try {
              const userResponse = await fetch('/api/admin/users')
              if (userResponse.ok) {
                const userData = await userResponse.json()
                setUsers(userData.users || [])
              }
            } catch (error) {
              console.error('Error refreshing users:', error)
            }
          }
          loadUsers()
          
          showSuccess(`User ${userId} has been deleted successfully`)
        } else {
          showError('Failed to delete user')
        }
      } catch (error) {
        console.error('Error deleting user:', error)
        showError('Failed to delete user')
      }
    }
  }

  const handleResetUserPassword = (userId) => {
    if (confirm('Reset password for this user? They will need to set a new password on next login.')) {
      const updatedUsers = users.map(user => 
        user.phone === userId 
          ? { ...user, passwordReset: true }
          : user
      )
      setUsers(updatedUsers)
      localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers))
      showSuccess('Password reset initiated. User will be prompted to set a new password on next login.')
    }
  }

  // Handle payment details update
  const handleUpdatePaymentDetails = (method, field, value) => {
    const updatedPaymentDetails = {
      ...paymentDetails,
      [method]: {
        ...paymentDetails[method],
        [field]: value
      }
    }
    setPaymentDetails(updatedPaymentDetails)
  }

  // Handle saving payment details to database
  const handleSavePaymentDetails = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'paymentDetails',
          value: paymentDetails,
          description: 'Payment method details for user recharges'
        }),
      })

      if (response.ok) {
        showSuccess('Payment settings saved successfully!')
        localStorage.setItem('paymentDetails', JSON.stringify(paymentDetails))
      } else {
        const error = await response.json()
        showError(error.message || 'Failed to save payment settings')
      }
    } catch (error) {
      console.error('Error saving payment settings:', error)
      showError('Failed to save payment settings')
    }
  }

  // Coupon management functions
  const handleAddCoupon = async () => {
    if (!newCoupon.code || !newCoupon.bonusAmount) {
      showError('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: newCoupon.code.toUpperCase(),
          bonusAmount: parseFloat(newCoupon.bonusAmount),
          maxUsage: newCoupon.maxUsage ? parseInt(newCoupon.maxUsage) : null,
          isActive: newCoupon.isActive,
          description: newCoupon.description
        }),
      })

      if (response.ok) {
        const coupon = await response.json()
        setCoupons(prev => [...prev, coupon])
        
        // Reset form
        setNewCoupon({
          code: '',
          bonusAmount: '',
          maxUsage: '',
          isActive: true,
          description: ''
        })
        setShowAddCoupon(false)
        showSuccess('Coupon created successfully!')
      } else {
        const error = await response.json()
        showError(error.message || 'Failed to create coupon')
      }
    } catch (error) {
      console.error('Error creating coupon:', error)
      showError('Failed to create coupon')
    }
  }

  const handleToggleCouponStatus = async (couponId) => {
    try {
      const response = await fetch('/api/coupons', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          couponId: couponId,
          action: 'toggle'
        }),
      })

      if (response.ok) {
        const updatedCoupon = await response.json()
        setCoupons(prev => prev.map(coupon => 
          coupon._id === couponId ? updatedCoupon : coupon
        ))
        showSuccess('Coupon status updated successfully!')
      } else {
        const error = await response.json()
        showError(error.message || 'Failed to update coupon')
      }
    } catch (error) {
      console.error('Error updating coupon:', error)
      showError('Failed to update coupon')
    }
  }

  const handleDeleteCoupon = async (couponId) => {
    if (confirm('Are you sure you want to delete this coupon?')) {
      try {
        const response = await fetch(`/api/coupons?id=${couponId}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          setCoupons(prev => prev.filter(coupon => coupon._id !== couponId))
          showSuccess('Coupon deleted successfully!')
        } else {
          const error = await response.json()
          showError(error.message || 'Failed to delete coupon')
        }
      } catch (error) {
        console.error('Error deleting coupon:', error)
        showError('Failed to delete coupon')
      }
    }
  }

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Checking admin access...</p>
        </div>
      </div>
    )
  }

  // Don't render if not admin logged in
  if (!isAdminLoggedIn) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400">
      {/* Admin Header */}
      <div className="bg-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
                <p className="text-gray-600">Manage your Honda Civic Investment platform</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
              <button 
                onClick={() => router.push('/')}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Back to Site
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex border-b overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-4 md:px-6 py-3 font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'plans'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Investment Plans
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 md:px-6 py-3 font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'users'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 md:px-6 py-3 font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'analytics'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('images')}
              className={`px-4 md:px-6 py-3 font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'images'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Image Management
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 md:px-6 py-3 font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'transactions'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-4 md:px-6 py-3 font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'payments'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Payment Settings
            </button>
            <button
              onClick={() => setActiveTab('coupons')}
              className={`px-4 md:px-6 py-3 font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'coupons'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Coupon Management
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            {/* Add/Edit Plan Form */}
            {showAddPlan && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {editingPlan ? 'Edit Plan' : 'Add New Plan'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Plan Name</label>
                    <input
                      type="text"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="Honda Civic Type R"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image File</label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newPlan.image}
                        onChange={(e) => setNewPlan({...newPlan, image: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                        placeholder="car1.jpeg"
                      />
                      <div className="text-xs text-gray-500">
                        Available images: car1.jpeg, car2.jpeg, car3.jpeg, car4.jpeg, car5.jpeg
                      </div>
                      <div className="flex space-x-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setNewPlan({...newPlan, image: 'car1.jpeg'})}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Car 1
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewPlan({...newPlan, image: 'car2.jpeg'})}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Car 2
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewPlan({...newPlan, image: 'car3.jpeg'})}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Car 3
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewPlan({...newPlan, image: 'car4.jpeg'})}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Car 4
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewPlan({...newPlan, image: 'car5.jpeg'})}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Car 5
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => {
                              const file = e.target.files[0];
                              if (file) {
                                if (file.size > 5 * 1024 * 1024) {
                                  showError('File size must be less than 5MB');
                                  return;
                                }
                                if (!file.type.startsWith('image/')) {
                                  showError('Please select an image file');
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  setNewPlan({...newPlan, image: e.target.result});
                                };
                                reader.readAsDataURL(file);
                              }
                            };
                            input.click();
                          }}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          📷 Upload New
                        </button>
                      </div>
                      {newPlan.image && (
                        <div className="mt-2">
                          <label className="block text-xs text-gray-600 mb-1">Preview:</label>
                          <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
                            <img 
                              src={getImageSrc(newPlan.image)} 
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs" style={{display: 'none'}}>
                              No Image
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Investment Amount</label>
                    <input
                      type="text"
                      value={newPlan.investAmount}
                      onChange={(e) => setNewPlan({...newPlan, investAmount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="$5,000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Daily Income</label>
                    <input
                      type="text"
                      value={newPlan.dailyIncome}
                      onChange={(e) => setNewPlan({...newPlan, dailyIncome: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="$25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Validity Period</label>
                    <input
                      type="text"
                      value={newPlan.validity}
                      onChange={(e) => setNewPlan({...newPlan, validity: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="200 days"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color Theme</label>
                    <select
                      value={newPlan.color}
                      onChange={(e) => setNewPlan({...newPlan, color: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                    >
                      <option value="from-red-500 to-red-700">Red</option>
                      <option value="from-blue-500 to-blue-700">Blue</option>
                      <option value="from-green-500 to-green-700">Green</option>
                      <option value="from-yellow-500 to-yellow-700">Yellow</option>
                      <option value="from-purple-500 to-purple-700">Purple</option>
                      <option value="from-indigo-500 to-indigo-700">Indigo</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={newPlan.description}
                      onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="High performance variant with turbocharged engine"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPlan.isActive}
                        onChange={(e) => setNewPlan({...newPlan, isActive: e.target.checked})}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Active Plan</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingPlan ? handleUpdatePlan : handleAddPlan}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {editingPlan ? 'Update Plan' : 'Add Plan'}
                  </button>
                </div>
              </div>
            )}

            {/* Plans List */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-800">Investment Plans</h3>
                  <div className="flex space-x-3">
                    <button
                      onClick={async () => {
                        console.log('Manual refresh of plans')
                        try {
                          const response = await fetch('/api/plans')
                          if (response.ok) {
                            const data = await response.json()
                            console.log('Refreshing plans:', data.plans)
                            setSamplePlans(data.plans)
                            showSuccess('Plans refreshed successfully!')
                          } else {
                            showError('Failed to refresh plans')
                          }
                        } catch (error) {
                          console.error('Error refreshing plans:', error)
                          showError('Error refreshing plans')
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Refresh</span>
                    </button>
                    {!showAddPlan && (
                      <button
                        onClick={() => setShowAddPlan(true)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Add New Plan
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Income</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {plans && plans.length > 0 ? plans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden mr-3">
                                                          <img 
                              src={getImageSrc(plan.image)} 
                              alt={plan.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs" style={{display: 'none'}}>
                                No Image
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                              <div className="text-sm text-gray-500">{plan.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.investAmount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{plan.dailyIncome}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            plan.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {plan.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditPlan(plan)}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleTogglePlanStatus(plan._id)}
                              className={`${
                                plan.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                              }`}
                            >
                              {plan.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeletePlan(plan._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                          No plans found. Loading...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">User Management</h3>
                <p className="text-gray-600">Manage registered users and their accounts.</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/admin/users')
                    if (response.ok) {
                      const data = await response.json()
                      setUsers(data.users || [])
                      showSuccess('Users list refreshed successfully!')
                    } else {
                      showError('Failed to refresh users list')
                    }
                  } catch (error) {
                    console.error('Error refreshing users:', error)
                    showError('Failed to refresh users list')
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>
            
            {users.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <p className="text-gray-500">No registered users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.phone} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center mr-3">
                              <span className="text-white text-sm font-bold">
                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.referralCode ? `Ref: ${user.referralCode}` : 'No referral'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isBlocked 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {user.isBlocked ? 'Blocked' : 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleBlockUser(user.phone)}
                              className={`${
                                user.isBlocked 
                                  ? 'text-green-600 hover:text-green-900' 
                                  : 'text-yellow-600 hover:text-yellow-900'
                              }`}
                            >
                              {user.isBlocked ? 'Unblock' : 'Block'}
                            </button>
                            <button
                              onClick={() => handleResetUserPassword(user.phone)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Reset Password
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.phone)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Users */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-800">{users.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Total Investments */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Investments</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {(() => {
                        let totalInvestments = 0;
                        users.forEach(user => {
                          const userInvestments = JSON.parse(localStorage.getItem(`investmentHistory_${user.phone}`) || '[]');
                          totalInvestments += userInvestments.length;
                        });
                        return totalInvestments;
                      })()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Total Revenue */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-800">
                      Rs{(() => {
                        let totalRevenue = 0;
                        const rechargeHistory = JSON.parse(localStorage.getItem('rechargeHistory') || '[]');
                        const approvedRecharges = rechargeHistory.filter(req => req.status === 'approved');
                        approvedRecharges.forEach(recharge => {
                          totalRevenue += parseFloat(recharge.amount);
                        });
                        return totalRevenue.toFixed(2);
                      })()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Active Coupons */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Coupons</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {coupons.filter(coupon => coupon.isActive).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {(() => {
                    const activities = [];
                    
                    // Add recent registrations
                    const recentUsers = users.slice(-3).reverse();
                    recentUsers.forEach(user => {
                      activities.push({
                        type: 'registration',
                        message: `New user registered: ${user.name}`,
                        date: user.registrationDate,
                        color: 'text-blue-600'
                      });
                    });
                    
                    // Add recent investments
                    users.forEach(user => {
                      const userInvestments = JSON.parse(localStorage.getItem(`investmentHistory_${user.phone}`) || '[]');
                      const recentInvestments = userInvestments.slice(-2);
                      recentInvestments.forEach(investment => {
                        activities.push({
                          type: 'investment',
                          message: `${user.name} invested in ${investment.planName}`,
                          date: investment.investDate,
                          color: 'text-green-600'
                        });
                      });
                    });
                    
                    // Add recent coupon usage
                    const recentCoupons = usedCoupons.slice(-3);
                    recentCoupons.forEach(coupon => {
                      activities.push({
                        type: 'coupon',
                        message: `${coupon.userName} used coupon ${coupon.couponCode}`,
                        date: coupon.usedDate,
                        color: 'text-purple-600'
                      });
                    });
                    
                    // Sort by date and take top 5
                    return activities
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .slice(0, 5)
                      .map((activity, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className={`w-2 h-2 rounded-full ${activity.color.replace('text-', 'bg-')}`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">{activity.message}</p>
                            <p className="text-xs text-gray-500">{new Date(activity.date).toLocaleString()}</p>
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              </div>

              {/* Investment Plan Performance */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Investment Plan Performance</h3>
                <div className="space-y-3">
                  {(() => {
                    const planStats = {};
                    
                    // Calculate stats for each plan
                    users.forEach(user => {
                      const userInvestments = JSON.parse(localStorage.getItem(`investmentHistory_${user.phone}`) || '[]');
                      userInvestments.forEach(investment => {
                        if (!planStats[investment.planName]) {
                          planStats[investment.planName] = {
                            count: 0,
                            totalAmount: 0
                          };
                        }
                        planStats[investment.planName].count++;
                        planStats[investment.planName].totalAmount += investment.amount;
                      });
                    });
                    
                    return Object.entries(planStats)
                      .sort((a, b) => b[1].count - a[1].count)
                      .map(([planName, stats]) => (
                        <div key={planName} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-800">{planName}</p>
                            <p className="text-sm text-gray-600">{stats.count} investments</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">Rs{stats.totalAmount.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">Total Value</p>
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Financial Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">Total Recharges</p>
                  <p className="text-2xl font-bold text-green-600">
                    Rs{(() => {
                      const rechargeHistory = JSON.parse(localStorage.getItem('rechargeHistory') || '[]');
                      const approvedRecharges = rechargeHistory.filter(req => req.status === 'approved');
                      return approvedRecharges.reduce((sum, req) => sum + parseFloat(req.amount), 0).toFixed(2);
                    })()}
                  </p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">Total Withdrawals</p>
                  <p className="text-2xl font-bold text-red-600">
                    Rs{(() => {
                      const withdrawHistory = JSON.parse(localStorage.getItem('withdrawHistory') || '[]');
                      const approvedWithdrawals = withdrawHistory.filter(req => req.status === 'approved');
                      return approvedWithdrawals.reduce((sum, req) => sum + parseFloat(req.amount), 0).toFixed(2);
                    })()}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">Coupon Bonuses</p>
                  <p className="text-2xl font-bold text-blue-600">
                    Rs{(() => {
                      return usedCoupons.reduce((sum, coupon) => sum + parseFloat(coupon.bonusAmount), 0).toFixed(2);
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'images' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Image Management</h3>
            <p className="text-gray-600 mb-6">Manage car images for your investment plans.</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {['car1.jpeg', 'car2.jpeg', 'car3.jpeg', 'car4.jpeg', 'car5.jpeg'].map((imageName, index) => (
                <div key={imageName} className="border border-gray-200 rounded-lg p-4 text-center">
                  <div className="w-full h-32 bg-gray-200 rounded-lg overflow-hidden mb-3">
                    <img 
                      src={getImageSrc(imageName)} 
                      alt={`Car ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm" style={{display: 'none'}}>
                      Image Not Found
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{imageName}</p>
                  <p className="text-xs text-gray-500">Car {index + 1}</p>
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            // Check file size (5MB limit)
                            if (file.size > 5 * 1024 * 1024) {
                              showError('File size must be less than 5MB');
                              return;
                            }
                            // Check file type
                            if (!file.type.startsWith('image/')) {
                              showError('Please select an image file');
                              return;
                            }
                            handleFileUpload(file, imageName);
                          }
                        };
                        input.click();
                      }}
                      className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    >
                      Upload Image
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Image Upload Instructions:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Supported formats: JPEG, PNG, GIF</li>
                <li>• Recommended size: 800x600 pixels or larger</li>
                <li>• File size: Maximum 5MB per image</li>
                <li>• Images should be placed in the public folder of your project</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Transaction Management</h3>
            
            {/* Recharge Requests */}
            <div className="mb-8">
              <h4 className="text-md font-semibold text-gray-700 mb-4">Pending Recharge Requests ({pendingRechargeRequests.length})</h4>
              {pendingRechargeRequests.length === 0 ? (
                <p className="text-gray-500">No pending recharge requests</p>
              ) : (
                <div className="space-y-3">
                  {pendingRechargeRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-800">{request.userName}</p>
                          <p className="text-sm text-gray-600">Phone: {request.userId}</p>
                          <p className="text-sm text-gray-600">Amount: ${request.amount}</p>
                          <p className="text-xs text-gray-500">Transaction ID: {request.transactionId}</p>
                          <p className="text-xs text-gray-500">Date: {new Date(request.date).toLocaleString()}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRechargeApproval(request.transactionId, true)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRechargeApproval(request.transactionId, false)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Withdraw Requests */}
            <div>
              <h4 className="text-md font-semibold text-gray-700 mb-4">Pending Withdraw Requests ({pendingWithdrawRequests.length})</h4>
              {pendingWithdrawRequests.length === 0 ? (
                <p className="text-gray-500">No pending withdraw requests</p>
              ) : (
                <div className="space-y-3">
                  {pendingWithdrawRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-800">{request.userName}</p>
                          <p className="text-sm text-gray-600">Phone: {request.userId}</p>
                          <p className="text-sm text-gray-600">Amount: ${request.amount}</p>
                          <p className="text-sm text-gray-600">Method: {request.withdrawalMethod}</p>
                          <p className="text-sm text-gray-600">Account: {request.withdrawalAccountName}</p>
                          <p className="text-xs text-gray-500">Transaction ID: {request.transactionId}</p>
                          <p className="text-xs text-gray-500">Date: {new Date(request.date).toLocaleString()}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleWithdrawApproval(request.transactionId, true)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleWithdrawApproval(request.transactionId, false)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Settings</h3>
            <p className="text-gray-600 mb-6">Manage payment method details for user recharges.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* EasyPaisa Settings */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">EP</span>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800">EasyPaisa</h4>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                    <input
                      type="text"
                      value={paymentDetails.easypaisa.number}
                      onChange={(e) => handleUpdatePaymentDetails('easypaisa', 'number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="0300 1234567"
                    />
                  </div>
                </div>
              </div>

              {/* JazzCash Settings */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">JC</span>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800">JazzCash</h4>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                    <input
                      type="text"
                      value={paymentDetails.jazzcash.number}
                      onChange={(e) => handleUpdatePaymentDetails('jazzcash', 'number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="0300 7654321"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSavePaymentDetails}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
              >
                Save Payment Settings
              </button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Payment Settings Info:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• These details will be shown to users when they recharge</li>
                <li>• Users can choose between EasyPaisa and JazzCash</li>
                <li>• Click "Save Payment Settings" to save changes</li>
                <li>• Make sure account numbers are correct and active</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'coupons' && (
          <div className="space-y-6">
            {/* Add Coupon Form */}
            {showAddCoupon && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Add New Coupon</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Coupon Code *</label>
                    <input
                      type="text"
                      value={newCoupon.code}
                      onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="WELCOME10"
                      maxLength="20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bonus Amount (Rs) *</label>
                    <input
                      type="number"
                      value={newCoupon.bonusAmount}
                      onChange={(e) => setNewCoupon({...newCoupon, bonusAmount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="10"
                      min="1"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Usage (Optional)</label>
                    <input
                      type="number"
                      value={newCoupon.maxUsage}
                      onChange={(e) => setNewCoupon({...newCoupon, maxUsage: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="100"
                      min="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited usage</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={newCoupon.isActive}
                      onChange={(e) => setNewCoupon({...newCoupon, isActive: e.target.value === 'true'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                    >
                      <option value={true}>Active</option>
                      <option value={false}>Inactive</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={newCoupon.description}
                      onChange={(e) => setNewCoupon({...newCoupon, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="Welcome bonus for new users"
                      rows="3"
                    />
                  </div>
                </div>
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={handleAddCoupon}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Create Coupon
                  </button>
                  <button
                    onClick={() => {
                      setShowAddCoupon(false)
                      setNewCoupon({
                        code: '',
                        bonusAmount: '',
                        maxUsage: '',
                        isActive: true,
                        description: ''
                      })
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Coupons List */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Coupon Management</h3>
                <button
                  onClick={() => setShowAddCoupon(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Add New Coupon
                </button>
              </div>

              {coupons.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No coupons available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Code</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Bonus Amount</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Usage</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map((coupon) => (
                        <tr key={coupon._id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-black">
                              {coupon.code}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-green-600">Rs{coupon.bonusAmount}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600">
                              {coupon.usageCount || 0}
                              {coupon.maxUsage && ` / ${coupon.maxUsage}`}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              coupon.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {coupon.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600">{coupon.description}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleToggleCouponStatus(coupon._id)}
                                className={`px-2 py-1 rounded text-xs ${
                                  coupon.isActive
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {coupon.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDeleteCoupon(coupon._id)}
                                className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Used Coupons History */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Coupon Usage History</h3>
              {usedCoupons.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No coupons have been used yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Coupon Code</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Bonus Amount</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Used Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usedCoupons.map((usedCoupon, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-gray-800">{usedCoupon.userName}</div>
                              <div className="text-sm text-gray-500">{usedCoupon.userPhone}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-black">
                              {usedCoupon.couponCode}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-green-600">Rs{usedCoupon.bonusAmount}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600">
                              {new Date(usedCoupon.usedDate).toLocaleDateString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
