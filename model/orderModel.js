
const mongoose = require('mongoose');  // why cartItemSchema => Q2*&3* on pending
const { defaultMaxListeners } = require('nodemailer/lib/xoauth2');

const ordererdItemSchema = new mongoose.Schema({     //creating and storing a copy of product  (for avoiding product changes prices in future(like price  hike)) 
    product: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Shoe', 
        required: true
    },
    productName: {
        type: String,
        required: true,
        trim: true
    },
    category : {
        type: String,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    regularPrice: {
        type: Number,
        required: true ,
    },
    images:{
        type:String,
        required:true
    },
    salePrice: {
        type: Number,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    OrderStatus: {
        type: String,
        enum: ['Confirmed', 'Shipped', 'Delivered', 'Canceled', 'Return-initiated','Return-Approved','Return-Rejected','Returned', 'Pending Payment'],  
        default: 'Confirmed'
    },
    Reason: {
        type: String,  
        default: ''
    },
    
    deliveryDate: {
        type: Date,       //this is were Bson has advantage cz bson can support more data type than json (for example date ,date.now, objectId ,) weer as json wont support date,data type 
        default: null
    }

},{
    timestamps: true
})

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  
        required: true
    },
    items: [ordererdItemSchema],  // Array of ordered items
    shippingAddress: {  // this is to store the address to save it or else if the user delete it then the adrress will be missing in order details 
        name : {
            type : String,
            required: true
        },
        phone : {
            type : String,
            required: true
        },
        pincode : {
            type : String,
            required: true
        },
        locality : {
            type : String,
            required : true
        },
        district : {
            type : String,
            required : true
        },
        state : {
            type : String,
            required : true
        },
        address : {
            type : String ,
            require : true
        },

    },
    totalRegularPrice: {
        type: Number,
        required: true
    },
    discount: {     // next time you crate a object of discount product discount ,category discount
        type: Number,
        required: true,
        default: 0
    },
    totalSalePrice: {
        type: Number,
        required: true
    },
    actualSalePrice:{
        type: Number,
        required: true
    },
    coupon:{
        id :{
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Coupon',
            default : null
        },
        discount :{
            type:Number,
            default: 0,
        }
    },
    paymentMethod: {   // recomender to put the payment thing in one objcet (eg - payment info { paymentmethod : value , payment status : value , payment id : value})
        type: String,
        enum: ['cod','razorpay','wallet'], 
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Canceled', 'Refunded','In Progress'],
        default: 'Pending'
    },
    paymentId  :{
        type : String,
        default : 'COD'  //no need of default
    },
    orderDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);