const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    customerPhone: {
      type: String,
      trim: true,
      default: ''
    },
    deliveryAddress: {
      type: String,
      trim: true,
      default: ''
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Order must have at least one item'
      }
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
        message: '{VALUE} is not a valid status'
      },
      default: 'pending'
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Indexes
orderSchema.index({ status: 1 });
orderSchema.index({ customerPhone: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
