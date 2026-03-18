const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Menu item name is required'],
      trim: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    available: {
      type: Boolean,
      default: true
    },
    imageUrl: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index for category filtering
menuItemSchema.index({ category: 1 });
menuItemSchema.index({ available: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
