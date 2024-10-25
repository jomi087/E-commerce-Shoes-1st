const mongoose = require('mongoose');  // why cartItemSchema => Q2*&3* on pending

const cartItemSchema = new mongoose.Schema({     //creating and storing a copy of product  (for avoiding product changes prices in future(like price  hike)) 
    product: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Shoe', 
        required: true
    },
    quantity: {
        type: Number,
        required: true,
       
        
    },
    regularPrice: {
        type: Number,
        required: true ,
    },
    salePrice: {  //product offer
        type: Number,
        required: true
    },
    OfferSalePrice : {  //o=category offer
        type: Number,
    },
    size: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    }
},{
    timestamps: true
});

// two way are there eithre you can refer user in this model or ref cart in user model(like done in address both way can be done )
//ref user in the cart is the good way

const cartSchema = new mongoose.Schema({    // actual cartschema  
    user: {      
        type: mongoose.Schema.Types.ObjectId,   
        ref: 'User', 
        required: true
    },

    items: [cartItemSchema] ,

    totalRegularPrice: {  // Total of regular prices of all items
        type: Number,
        required: true,
        default: 0
    },
    discount: {           // Difference between total regular price and total sale price
        type: Number,
        required: true,
        default: 0
    },
    totalSalePrice: {   //actual total amount
        type: Number,
        required: true,
        default: 0
    },
    actualSalePrice:{
        type: Number,
        required: false,
        default: 0
    },
    totalItems: {          //  number of products
        type: Number,
        required: true,
        default: 0
    },
}, {
    timestamps: true 
});

module.exports = mongoose.model('Cart', cartSchema);





