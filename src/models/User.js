import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  referralCode: {
    type: String,
    default: null
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  balance: {
    type: Number,
    default: 0
  },
  earnBalance: {
    type: Number,
    default: 0
  },
  totalRecharge: {
    type: Number,
    default: 0
  },
  lastDailyIncomeDate: {
    type: String,
    default: null
  },
  investmentPlans: {
    type: [{
      planId: String,
      planName: String,
      amount: Number,
      startDate: Date,
      endDate: Date,
      status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
      }
    }],
    default: []
  },
  rechargeHistory: {
    type: [{
      amount: Number,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      date: {
        type: Date,
        default: Date.now
      }
    }],
    default: []
  },
  withdrawHistory: {
    type: [{
      amount: Number,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      date: {
        type: Date,
        default: Date.now
      }
    }],
    default: []
  },
  couponHistory: {
    type: [{
      couponCode: String,
      bonusAmount: Number,
      date: {
        type: Date,
        default: Date.now
      }
    }],
    default: []
  },
  teamMembers: {
    type: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      level: {
        type: String,
        enum: ['A', 'B', 'C'],
        default: 'A'
      },
      joinDate: {
        type: Date,
        default: Date.now
      }
    }],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without password)
userSchema.methods.toPublicJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  
  // Ensure arrays are properly initialized
  if (!userObject.investmentPlans) userObject.investmentPlans = [];
  if (!userObject.rechargeHistory) userObject.rechargeHistory = [];
  if (!userObject.withdrawHistory) userObject.withdrawHistory = [];
  if (!userObject.couponHistory) userObject.couponHistory = [];
  if (!userObject.teamMembers) userObject.teamMembers = [];
  
  return userObject;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User; 
