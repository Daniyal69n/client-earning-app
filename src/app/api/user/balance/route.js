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
        
        // Create withdrawal transaction (pending - requires admin approval)
        await Transaction.create({
          userId: userId,
          type: 'withdraw',
          amount: data.amount,
          status: 'pending',
          description: `Withdrawal request via ${data.withdrawalMethod}`,
          withdrawalMethod: data.withdrawalMethod,
          withdrawalAccountName: data.withdrawalAccountName,
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
              totalTeamIncome += commission;
            }
          }
        }
        
        // Add team income to both earn balance and account balance
        if (totalTeamIncome > 0) {
          // Ensure balance fields are numbers before arithmetic operations
          const currentEarnBalance = typeof user.earnBalance === 'number' ? user.earnBalance : 0;
          const currentBalance = typeof user.balance === 'number' ? user.balance : 0;
          
          const newEarnBalance = currentEarnBalance + totalTeamIncome;
          const newBalance = currentBalance + totalTeamIncome;
          
          await User.findOneAndUpdate(
            { phone: userId },
            { 
              earnBalance: newEarnBalance,
              balance: newBalance
            }
          );
          
          // Create transaction record
          await Transaction.create({
            userId: userId,
            type: 'referral_income',
            amount: totalTeamIncome,
            status: 'completed',
            description: 'Team referral income (3-tier system)',
            transactionId: 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase()
          });
        }
        
        return NextResponse.json({
          message: 'Team income calculated successfully',
          totalTeamIncome: totalTeamIncome
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