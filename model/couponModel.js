const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    discountPercentage:{
        type:Number,
        required:true
    },
    minPurchaseAmount: {
        type: Number,
        required: true,
        default:0
    },
    maxCapAmount: {
        type: Number,
        required: true
    },
    expiryDate: {
        type: Date,
        required: false
    },
    usedBy: [{     // To track users who used the coupon
        type: mongoose.Schema.Types.ObjectId,     
        ref: 'User' 
    }],
    usageLimit: {         // Number of times the coupon can be used
        type: Number,
        default: 1  
    }, 
    isActive:{
        type:Boolean,
        default:true
    }
})


module.exports = mongoose.model('Coupon',couponSchema)