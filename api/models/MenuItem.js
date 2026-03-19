const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    idx: {
      type: Number,
      unique: true
    },
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
    media: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Auto-assign next sequential idx on insert if not provided
menuItemSchema.pre('save', async function (next) {
  if (this.isNew && this.idx == null) {
    const last = await this.constructor.findOne({}, {}, { sort: { idx: -1 } });
    this.idx = (last?.idx ?? 0) + 1;
  }
  next();
});

menuItemSchema.index({ category: 1 });
menuItemSchema.index({ available: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
