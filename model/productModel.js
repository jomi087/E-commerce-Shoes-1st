const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    regularPrice: {
        type: Number,
        required: true ,
        min: 0 
    },
    salePrice: {
        type: Number,
        required: true,
        min: 0
    },
    OfferSalePrice : {
        type: Number,
        
    },
    unitsInStock: {
        type: Number,
        required: true,
        min: 0
    },
    sizesAvailable: {
        type: [String], // Array of sizes available
        required: true
    },
    primaryColor: {
        type: String,
        required: true,
        trim: true
    },
    images: {
        type: [String], // Array of image URLs
        required: true
    },
    discount :{
        type : Number ,
        required : true
    },
    forSale : {
        type: Boolean,
        default: true
    },
    dateAdded: {
        type: Date,
        default: Date.now
    },
   
});

module.exports = mongoose.model('Shoe', productSchema);
