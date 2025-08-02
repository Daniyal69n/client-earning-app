import { NextResponse } from 'next/server';
import { connectDB } from '../../../lib/mongodb';
import User from '../../../models/User';
import Transaction from '../../../models/Transaction';

export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the user
    const user = await User.findOne({ phone: userId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get team members (3-tier system)
    const levelAMembers = await User.find({ referralCode: userId });
    const levelBMembers = await User.find({
      referralCode: { $in: levelAMembers.map(member => member.phone) }
    });
    const levelCMembers = await User.find({
      referralCode: { $in: levelBMembers.map(member => member.phone) }
    });

    // Calculate commission for each level
    let levelAIncome = 0;
    let levelBIncome = 0;
    let levelCIncome = 0;

    // Level A: 16% commission
    for (const member of levelAMembers) {
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
    }

    // Level B: 2% commission
    for (const member of levelBMembers) {
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
      
      const commission = memberTotalActivity * 0.02;
      levelBIncome += commission;
    }

    // Level C: 2% commission
    for (const member of levelCMembers) {
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
      
      const commission = memberTotalActivity * 0.02;
      levelCIncome += commission;
    }

    const totalTeamIncome = levelAIncome + levelBIncome + levelCIncome;

    return NextResponse.json({
      message: 'Team commission calculation test completed',
      user: {
        phone: user.phone,
        name: user.name,
        currentBalance: user.balance,
        currentEarnBalance: user.earnBalance,
        currentReferralCommission: user.referralCommission,
        currentTotalCommissionEarned: user.totalCommissionEarned
      },
      teamStructure: {
        levelA: {
          count: levelAMembers.length,
          members: levelAMembers.map(m => ({ phone: m.phone, name: m.name }))
        },
        levelB: {
          count: levelBMembers.length,
          members: levelBMembers.map(m => ({ phone: m.phone, name: m.name }))
        },
        levelC: {
          count: levelCMembers.length,
          members: levelCMembers.map(m => ({ phone: m.phone, name: m.name }))
        }
      },
      commissionCalculation: {
        levelAIncome: levelAIncome,
        levelBIncome: levelBIncome,
        levelCIncome: levelCIncome,
        totalTeamIncome: totalTeamIncome
      },
      commissionRates: {
        levelA: '16%',
        levelB: '2%',
        levelC: '2%'
      }
    });

  } catch (error) {
    console.error('Team commission test error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 