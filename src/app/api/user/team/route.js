import { connectDB } from '../../../../lib/mongodb';
import User from '../../../../models/User';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return Response.json({ message: 'User ID is required' }, { status: 400 });
    }
    
    // Find the user
    const user = await User.findOne({ phone: userId });
    if (!user) {
      return Response.json({ message: 'User not found' }, { status: 404 });
    }
    
    // Get Level A members (direct referrals)
    const levelAMembers = await User.find({ referralCode: userId });
    
    // Get Level B members (indirect referrals)
    const levelBMembers = await User.find({
      referralCode: { $in: levelAMembers.map(member => member.phone) }
    });
    
    // Get Level C members (third level referrals)
    const levelCMembers = await User.find({
      referralCode: { $in: levelBMembers.map(member => member.phone) }
    });
    
    // Calculate team statistics
    const totalMembers = levelAMembers.length + levelBMembers.length + levelCMembers.length;
    
    // Calculate total earnings from team (3-tier system)
    let totalTeamEarnings = 0;
    
    // Level A: 16% commission
    for (const member of levelAMembers) {
      const memberTotalActivity = member.balance + member.earnBalance;
      totalTeamEarnings += memberTotalActivity * 0.16;
    }
    
    // Level B: 2% commission
    for (const member of levelBMembers) {
      const memberTotalActivity = member.balance + member.earnBalance;
      totalTeamEarnings += memberTotalActivity * 0.02;
    }
    
    // Level C: 2% commission
    for (const member of levelCMembers) {
      const memberTotalActivity = member.balance + member.earnBalance;
      totalTeamEarnings += memberTotalActivity * 0.02;
    }
    
    return Response.json({
      totalMembers,
      totalTeamEarnings,
      levelA: {
        count: levelAMembers.length,
        members: levelAMembers.map(member => ({
          name: member.name,
          phone: member.phone,
          balance: member.balance,
          earnBalance: member.earnBalance,
          joinDate: member.createdAt
        }))
      },
      levelB: {
        count: levelBMembers.length,
        members: levelBMembers.map(member => ({
          name: member.name,
          phone: member.phone,
          balance: member.balance,
          earnBalance: member.earnBalance,
          joinDate: member.createdAt
        }))
      },
      levelC: {
        count: levelCMembers.length,
        members: levelCMembers.map(member => ({
          name: member.name,
          phone: member.phone,
          balance: member.balance,
          earnBalance: member.earnBalance,
          joinDate: member.createdAt
        }))
      }
    });
    
  } catch (error) {
    console.error('Team data error:', error.message);
    console.error('Full error:', error);
    return Response.json({ 
      message: 'Internal server error', 
      error: error.message 
    }, { status: 500 });
  }
} 