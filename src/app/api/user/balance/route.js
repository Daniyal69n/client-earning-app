import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/mongodb';
import User from '../../../../models/User';
import UserInvestment from '../../../../models/UserInvestment';
import Transaction from '../../../../models/Transaction';

export async function PUT(request) {
  try {
    const { userId, operation, planId, ...data } = await request.json();

    if (!userId || !operation) {
      return NextResponse.json(
        { error: 'User ID and operation are required' },
        { status: 400 }
      );
    }

    // Try to connect to MongoDB
    let user = null;
    try {
      await connectDB();
      user = await User.findOne({ phone: userId });
    } catch (dbError) {
      console.error('MongoDB connection failed:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed. Please try again later.' },
        { status: 503 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Ensure totalRecharge field exists (for backward compatibility)
    if (user.totalRecharge === undefined || user.totalRecharge === null) {
      user.totalRecharge = 0;
    }

    let updateData = {};

    switch (operation) {
      case 'recharge': {
        // Create recharge transaction (pending - requires admin approval)
        const transaction = await Transaction.create({
          userId: userId,
          type: 'recharge',
          amount: data.amount,
          status: 'pending',
          description: `Recharge request via ${data.paymentMethod}`,
          paymentMethod: data.paymentMethod,
          paymentAccountName: data.paymentAccountName,
          userTransactionId: data.transactionId || null,
          transactionId: 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase()
        });
        
        // Don't update balance immediately - wait for admin approval
        // Balance and totalRecharge will be updated when admin approves the transaction
        break;
      }

      case 'withdraw': {
        // Check if user has sufficient balance
        const currentBalance = typeof user.balance === 'number' ? user.balance : 0;
        if (currentBalance < data.amount) {
          return NextResponse.json(
            { error: 'Insufficient balance for withdrawal' },
            { status: 400 }
          );
        }
        
        // Calculate withdrawal fee (25%)
        const withdrawalFee = data.amount * 0.25;
        const amountAfterFee = data.amount - withdrawalFee;
        
        // Create withdrawal transaction (pending - requires admin approval)
        await Transaction.create({
          userId: userId,
          type: 'withdraw',
          amount: data.amount, // Original amount requested
          withdrawalFee: withdrawalFee, // 25% fee
          amountAfterFee: amountAfterFee, // Amount after fee deduction
          status: 'pending',
          description: `Withdrawal request via ${data.withdrawalMethod} (Fee: Rs${withdrawalFee.toFixed(2)})`,
          withdrawalMethod: data.withdrawalMethod,
          withdrawalAccountName: data.withdrawalAccountName,
          withdrawalNumber: data.withdrawalNumber,
          transactionId: 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase()
        });
        
        // Don't deduct balance immediately - wait for admin approval
        // Balance will be deducted when admin approves the transaction
        break;
      }

      case 'cancel_plan': {
        // Cancel investment plan
        await UserInvestment.findOneAndUpdate(
          { userId: userId, _id: planId },
          { isActive: false }
        );
        break;
      }

      case 'check_daily_income': {
        // Check and add daily income if not already added today
        const currentDate = new Date().toDateString();
        const lastIncomeDate = user.lastDailyIncomeDate;
        
        if (lastIncomeDate !== currentDate) {
          // Get active investment
          const activeInvestment = await UserInvestment.findOne({
            userId: userId,
            isActive: true
          });
          
          if (activeInvestment) {
            // Check if it's time for the first income (24 hours after investDate)
            const now = new Date();
            const firstIncomeDate = new Date(activeInvestment.firstIncomeDate);
            
            // Only add income if current time has passed the first income date
            if (now >= firstIncomeDate) {
              const dailyIncomeAmount = parseFloat(activeInvestment.dailyIncome.replace(/[$,₹Rs]/g, '').replace(/,/g, ''));
              
              // Ensure balance fields are numbers before arithmetic operations
              const currentEarnBalance = typeof user.earnBalance === 'number' ? user.earnBalance : 0;
              const currentBalance = typeof user.balance === 'number' ? user.balance : 0;
              
              // Update user balances - add to both earn balance and account balance
              const newEarnBalance = currentEarnBalance + dailyIncomeAmount;
              const newBalance = currentBalance + dailyIncomeAmount;
              
              await User.findOneAndUpdate(
                { phone: userId },
                { 
                  earnBalance: newEarnBalance,
                  balance: newBalance,
                  lastDailyIncomeDate: currentDate
                }
              );
              
              // Create transaction record
              await Transaction.create({
                userId: userId,
                type: 'daily_income',
                amount: dailyIncomeAmount,
                status: 'completed',
                description: `Daily income from ${activeInvestment.planName}`,
                transactionId: 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase()
              });
              
              // Update investment record
              await UserInvestment.findOneAndUpdate(
                { _id: activeInvestment._id },
                { 
                  totalEarned: activeInvestment.totalEarned + dailyIncomeAmount,
                  lastIncomeDate: new Date()
                }
              );
              
              return NextResponse.json({
                message: 'Daily income added successfully',
                incomeAdded: true,
                incomeAmount: dailyIncomeAmount,
                newEarnBalance: newEarnBalance,
                newBalance: newBalance
              });
            } else {
              // Calculate time remaining until first income
              const timeRemaining = firstIncomeDate.getTime() - now.getTime();
              const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));
              
              return NextResponse.json({
                message: `First daily income will be added in ${hoursRemaining} hours`,
                incomeAdded: false,
                hoursRemaining: hoursRemaining
              });
            }
          }
        }
        
        return NextResponse.json({
          message: 'No daily income to add',
          incomeAdded: false
        });
      }

      case 'calculate_team_income': {
        // Calculate team income (3-tier referral system)
        const teamMembers = await User.find({ referralCode: userId });
        let totalTeamIncome = 0;
        let levelAIncome = 0;
        let levelBIncome = 0;
        let levelCIncome = 0;
        
        // Level A: Direct referrals (16% commission)
        for (const member of teamMembers) {
          const memberTransactions = await Transaction.find({
            userId: member.phone,
            status: 'completed'
          });
          
          const memberTotalActivity = memberTransactions.reduce((sum, tx) => {
            if (tx.type === 'recharge' || tx.type === 'withdraw') {
              return sum + tx.amount;
            }
            return sum;
          }, 0);
          
          const commission = memberTotalActivity * 0.16;
          levelAIncome += commission;
          totalTeamIncome += commission;
        }
        
        // Level B: Indirect referrals (2% commission)
        for (const levelAMember of teamMembers) {
          const levelBMembers = await User.find({ referralCode: levelAMember.phone });
          
          for (const levelBMember of levelBMembers) {
            const memberTransactions = await Transaction.find({
              userId: levelBMember.phone,
              status: 'completed'
            });
            
            const memberTotalActivity = memberTransactions.reduce((sum, tx) => {
              if (tx.type === 'recharge' || tx.type === 'withdraw') {
                return sum + tx.amount;
              }
              return sum;
            }, 0);
            
            const commission = memberTotalActivity * 0.02;
            levelBIncome += commission;
            totalTeamIncome += commission;
          }
        }
        
        // Level C: Third level referrals (2% commission)
        for (const levelAMember of teamMembers) {
          const levelBMembers = await User.find({ referralCode: levelAMember.phone });
          
          for (const levelBMember of levelBMembers) {
            const levelCMembers = await User.find({ referralCode: levelBMember.phone });
            
            for (const levelCMember of levelCMembers) {
              const memberTransactions = await Transaction.find({
                userId: levelCMember.phone,
                status: 'completed'
              });
              
              const memberTotalActivity = memberTransactions.reduce((sum, tx) => {
                if (tx.type === 'recharge' || tx.type === 'withdraw') {
                  return sum + tx.amount;
                }
                return sum;
              }, 0);
              
              const commission = memberTotalActivity * 0.02;
              levelCIncome += commission;
              totalTeamIncome += commission;
            }
          }
        }
        
        // Update user's referral commission and total commission earned
        const currentReferralCommission = typeof user.referralCommission === 'number' ? user.referralCommission : 0;
        const currentTotalCommissionEarned = typeof user.totalCommissionEarned === 'number' ? user.totalCommissionEarned : 0;
        
        // Add new team income to referral commission
        const newReferralCommission = currentReferralCommission + totalTeamIncome;
        const newTotalCommissionEarned = currentTotalCommissionEarned + totalTeamIncome;
        
        // Also add to earn balance and account balance for immediate use
        const currentEarnBalance = typeof user.earnBalance === 'number' ? user.earnBalance : 0;
        const currentBalance = typeof user.balance === 'number' ? user.balance : 0;
        
        const newEarnBalance = currentEarnBalance + totalTeamIncome;
        const newBalance = currentBalance + totalTeamIncome;
        
        await User.findOneAndUpdate(
          { phone: userId },
          { 
            referralCommission: newReferralCommission,
            totalCommissionEarned: newTotalCommissionEarned,
            earnBalance: newEarnBalance,
            balance: newBalance
          }
        );
        
        // Create transaction record for team income
        if (totalTeamIncome > 0) {
          await Transaction.create({
            userId: userId,
            type: 'referral_income',
            amount: totalTeamIncome,
            status: 'completed',
            description: `Team referral income - Level A: Rs${levelAIncome.toFixed(2)}, Level B: Rs${levelBIncome.toFixed(2)}, Level C: Rs${levelCIncome.toFixed(2)}`,
            transactionId: 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase()
          });
        }
        
        return NextResponse.json({
          message: 'Team income calculated successfully',
          totalTeamIncome: totalTeamIncome,
          levelAIncome: levelAIncome,
          levelBIncome: levelBIncome,
          levelCIncome: levelCIncome,
          newReferralCommission: newReferralCommission,
          newTotalCommissionEarned: newTotalCommissionEarned,
          newEarnBalance: newEarnBalance,
          newBalance: newBalance
        });
      }

      case 'update_balance': {
        // Update balance directly (for admin operations)
        if (data.earnBalance !== undefined) {
          user.earnBalance = typeof data.earnBalance === 'number' ? data.earnBalance : 0;
        }
        if (data.balance !== undefined) {
          user.balance = typeof data.balance === 'number' ? data.balance : 0;
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }

    await user.save();

    // Return updated user data without password
    const userData = user.toPublicJSON();
    
    // Ensure totalRecharge is included in response
    if (userData.totalRecharge === undefined || userData.totalRecharge === null) {
      userData.totalRecharge = 0;
    }

    return NextResponse.json({
      message: 'Operation completed successfully',
      user: userData
    });

  } catch (error) {
    console.error('User balance operation error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId: userId,
      operation: operation
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 
