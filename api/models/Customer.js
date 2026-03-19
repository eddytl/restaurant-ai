const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true,
      unique: true
    },
    totalOrders: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    lastOrderAt: {
      type: Date,
      default: null
    },
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
      }
    ],
    preferredBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null
    }
  },
  {
    timestamps: true
  }
);

customerSchema.index({ phone: 1 });

module.exports = mongoose.model('Customer', customerSchema);
