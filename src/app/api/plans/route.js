import { connectDB } from '../../../lib/mongodb';
import InvestmentPlan from '../../../models/InvestmentPlan';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    
    let query = {};
    
    if (active === 'true') {
      query.isActive = true;
    }
    
    const plans = await InvestmentPlan.find(query).sort({ createdAt: -1 });
    
    return Response.json(plans);
    
  } catch (error) {
    console.error('Plans fetch error:', error.message);
    console.error('Full error:', error);
    return Response.json({ 
      message: 'Internal server error', 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    
    const { name, image, investAmount, dailyIncome, validity, color, description } = await request.json();
    
    if (!name || !investAmount || !dailyIncome || !validity) {
      return Response.json({ message: 'Name, investment amount, daily income, and validity are required' }, { status: 400 });
    }
    
    // Create plan
    const plan = await InvestmentPlan.create({
      name,
      image: image || 'car1.jpeg',
      investAmount,
      dailyIncome,
      validity,
      color: color || 'from-purple-500 to-purple-700',
      description: description || '',
      isActive: true
    });
    
    return Response.json({ plan });
    
  } catch (error) {
    console.error('Plan creation error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    
    const { id, ...updateData } = await request.json();
    
    if (!id) {
      return Response.json({ message: 'Plan ID is required' }, { status: 400 });
    }
    
    const plan = await InvestmentPlan.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!plan) {
      return Response.json({ message: 'Plan not found' }, { status: 404 });
    }
    
    return Response.json({ plan });
    
  } catch (error) {
    console.error('Plan update error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('id');
    
    if (!planId) {
      return Response.json({ message: 'Plan ID is required' }, { status: 400 });
    }
    
    const plan = await InvestmentPlan.findByIdAndDelete(planId);
    
    if (!plan) {
      return Response.json({ message: 'Plan not found' }, { status: 404 });
    }
    
    return Response.json({ message: 'Plan deleted successfully' });
    
  } catch (error) {
    console.error('Plan deletion error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
} 