const mongoose = require('mongoose');

const wishListSchema = new  mongoose.Schema({
    user: {
        type : mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    products : [{
        type : mongoose.Schema.Types.ObjectId,
        ref: 'Shoe',
        required : true,
    }]
},{timestamp : true })

module.exports = mongoose.model('Wishlist',wishListSchema)

