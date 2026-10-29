import mongoose from 'mongoose';

const sizeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    priceDelta: { type: Number, default: 0 },
  },
  { _id: false }
);

const recipeItemSchema = new mongoose.Schema(
  {
    ingredientId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Price must be positive'],
    },
    cost: {
      type: Number,
      default: 0,
      min: [0, 'Cost must be positive'],
    },
    sku: {
      type: String,
      trim: true,
    },
    prepTime: {
      type: Number,
      default: 3,
    },
    available: {
      type: Boolean,
      default: true,
      index: true,
    },
    image: {
      type: String,
      default: '/src/assets/images/coffee_cappuccino_1792072634092.jpg',
    },
    sizes: [sizeSchema],
    recipe: [recipeItemSchema],
  },
  {
    timestamps: true,
  }
);

productSchema.pre('save', function (next) {
  if (!this.id) {
    this.id = `prod-${Date.now()}`;
  }
  next();
});

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;
