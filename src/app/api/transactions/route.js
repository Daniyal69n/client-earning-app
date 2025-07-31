import { connectDB } from '../../../lib/mongodb';
import Transaction from '../../../models/Transaction';
import User from '../../../models/User';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    
    let query = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(100);
    
    return Response.json(transactions);
    
  } catch (error) {
    console.error('Transaction fetch error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    
    const transactionData = await request.json();
    
    // Validate required fields
    if (!transactionData.userId || !transactionData.amount || !transactionData.type) {
      return Response.json({ message: 'User ID, amount, and type are required' }, { status: 400 });
    }
    
    // Check if user exists
    const user = await User.findOne({ phone: transactionData.userId });
    if (!user) {
      return Response.json({ message: 'User not found' }, { status: 404 });
    }
    
    // Create transaction object
    const transactionObject = {
      userId: transactionData.userId,
      userName: transactionData.userName,
      type: transactionData.type,
      amount: transactionData.amount,
      status: transactionData.status || 'pending',
      description: transactionData.description || `${transactionData.type} transaction`,
      paymentMethod: transactionData.paymentMethod,
      paymentAccountName: transactionData.paymentAccountName,
      paymentNumber: transactionData.paymentNumber,
      withdrawalMethod: transactionData.withdrawalMethod,
      withdrawalAccountName: transactionData.withdrawalAccountName,
      withdrawalNumber: transactionData.withdrawalNumber,
      userTransactionId: transactionData.transactionId || null
    };
    
    // Create transaction
    const transaction = await Transaction.create(transactionObject);
    
    return Response.json(transaction);
    
  } catch (error) {
    console.error('Transaction creation error:', error.message);
    return Response.json({ 
      message: 'Internal server error',
      error: error.message 
    }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    
    const { transactionId, action, ...updateData } = await request.json();
    
    console.log('Transaction approval request:', { transactionId, action });
    
    if (!transactionId || !action) {
      return Response.json({ message: 'Transaction ID and action are required' }, { status: 400 });
    }
    
    let transaction = await Transaction.findOne({ transactionId });
    if (!transaction) {
      return Response.json({ message: 'Transaction not found' }, { status: 404 });
    }
    
    console.log('Found transaction:', { 
      type: transaction.type, 
      amount: transaction.amount, 
      status: transaction.status,
      userId: transaction.userId 
    });
    
    switch (action) {
      case 'approve':
        transaction.status = 'approved';
        
        // Update user balance when transaction is approved
        const user = await User.findOne({ phone: transaction.userId });
        if (user) {
          // Ensure totalRecharge field exists and is a number
          if (user.totalRecharge === undefined || user.totalRecharge === null) {
            user.totalRecharge = 0;
          }
          
          console.log('User found before update:', {
            phone: user.phone,
            balance: user.balance,
            totalRecharge: user.totalRecharge,
            balanceType: typeof user.balance,
            totalRechargeType: typeof user.totalRecharge
          });
          
          if (transaction.type === 'recharge') {
            // For recharge: add to balance and totalRecharge when approved
            const currentBalance = typeof user.balance === 'number' ? user.balance : 0;
            const currentTotalRecharge = typeof user.totalRecharge === 'number' ? user.totalRecharge : 0;
            
            user.balance = currentBalance + transaction.amount;
            user.totalRecharge = currentTotalRecharge + transaction.amount;
            
            console.log('Approving recharge - updating balance:', {
              currentBalance: currentBalance,
              newBalance: user.balance,
              currentTotalRecharge: currentTotalRecharge,
              newTotalRecharge: user.totalRecharge,
              amount: transaction.amount
            });
          } else if (transaction.type === 'withdraw') {
            // For withdrawal: deduct from balance when approved
            const currentBalance = typeof user.balance === 'number' ? user.balance : 0;
            
            user.balance = currentBalance - transaction.amount;
            
            console.log('Approving withdrawal - updating balance:', {
              currentBalance: currentBalance,
              newBalance: user.balance,
              amount: transaction.amount
            });
          }
          
          // Use findOneAndUpdate to ensure the field is properly saved
          await User.findOneAndUpdate(
            { phone: transaction.userId },
            { 
              balance: user.balance,
              totalRecharge: user.totalRecharge
            },
            { new: true }
          );
          
          // Verify the update worked
          const updatedUser = await User.findOne({ phone: transaction.userId });
          console.log('User after save:', {
            phone: updatedUser.phone,
            balance: updatedUser.balance,
            totalRecharge: updatedUser.totalRecharge,
            balanceType: typeof updatedUser.balance,
            totalRechargeType: typeof updatedUser.totalRecharge
          });
        }
        break;
        
      case 'reject':
        transaction.status = 'rejected';
        
        // No balance changes needed when rejecting since balance wasn't changed when submitted
        console.log('Rejecting transaction - no balance change needed');
        break;
        
      case 'update':
        Object.assign(transaction, updateData);
        break;
        
      default:
        return Response.json({ message: 'Invalid action' }, { status: 400 });
    }
    
    await transaction.save();
    
    console.log('Transaction updated successfully:', { 
      transactionId: transaction.transactionId, 
      status: transaction.status 
    });
    
    return Response.json(transaction);
    
  } catch (error) {
    console.error('Transaction update error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
} 
