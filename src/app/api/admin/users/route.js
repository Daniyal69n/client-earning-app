import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/mongodb';
import User from '../../../../models/User';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Get users with pagination
    const users = await User.find(searchQuery)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalUsers = await User.countDocuments(searchQuery);

    // Get statistics
    const totalDeposits = await User.aggregate([
      { $unwind: '$rechargeHistory' },
      { $match: { 'rechargeHistory.status': 'approved' } },
      { $group: { _id: null, total: { $sum: '$rechargeHistory.amount' } } }
    ]);

    const totalWithdrawals = await User.aggregate([
      { $unwind: '$withdrawHistory' },
      { $match: { 'withdrawHistory.status': 'approved' } },
      { $group: { _id: null, total: { $sum: '$withdrawHistory.amount' } } }
    ]);

    const blockedUsers = await User.countDocuments({ isBlocked: true });
    const activeUsers = await User.countDocuments({ isBlocked: false });

    return NextResponse.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNextPage: page * limit < totalUsers,
        hasPrevPage: page > 1
      },
      statistics: {
        totalDeposits: totalDeposits[0]?.total || 0,
        totalWithdrawals: totalWithdrawals[0]?.total || 0,
        blockedUsers,
        activeUsers
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    
    const { userId, action, data } = await request.json();

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'User ID and action are required' },
        { status: 400 }
      );
    }

    let updateData = {};

    switch (action) {
      case 'block':
        updateData = { isBlocked: true };
        break;
      case 'unblock':
        updateData = { isBlocked: false };
        break;
      case 'make_admin':
        updateData = { isAdmin: true };
        break;
      case 'remove_admin':
        updateData = { isAdmin: false };
        break;
      case 'update_balance':
        updateData = { balance: data.balance };
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'User updated successfully',
      user
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 