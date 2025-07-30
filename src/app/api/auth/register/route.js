import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Transaction from '../../../../models/Transaction';

export async function POST(request) {
  try {
    await connectDB();
    
    const { name, phone, password, email, referralCode } = await request.json();

    // Validate required fields
    if (!name || !phone || !password || !email) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ phone }, { email }]
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this phone number or email already exists' },
        { status: 400 }
      );
    }

    // Validate referral code if provided
    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ phone: referralCode });
      if (!referrer) {
        return NextResponse.json(
          { error: 'Invalid referral code' },
          { status: 400 }
        );
      }
    }

    // Create new user
    const user = new User({
      name,
      phone,
      password,
      email,
      referralCode: referralCode || null
    });

    await user.save();

    // Add user to referrer's team and give referral bonus if referral code was used
    if (referrer) {
      referrer.teamMembers.push({
        userId: user._id,
        level: 'A',
        joinDate: new Date()
      });
      
      // Give referral bonus to referrer (add to both earn balance and account balance)
      const currentBalance = typeof referrer.balance === 'number' ? referrer.balance : 0;
      const currentEarnBalance = typeof referrer.earnBalance === 'number' ? referrer.earnBalance : 0;
      
      const referralBonus = 100; // $100 referral bonus
      const newBalance = currentBalance + referralBonus;
      const newEarnBalance = currentEarnBalance + referralBonus;
      
      referrer.balance = newBalance;
      referrer.earnBalance = newEarnBalance;
      
      await referrer.save();
      
      // Create transaction record for referral bonus
      await Transaction.create({
        userId: referrer.phone,
        type: 'referral_income',
        amount: referralBonus,
        status: 'completed',
        description: `Referral bonus for new user: ${user.name} (${user.phone})`,
        referralLevel: 'A',
        transactionId: 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase()
      });
    }

    // Return user data without password
    const userData = user.toPublicJSON();

    return NextResponse.json({
      message: 'Registration successful',
      ...userData
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 