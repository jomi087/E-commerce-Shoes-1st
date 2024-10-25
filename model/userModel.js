const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,  
    },
    mobile: {
        type: String,
        default: null
    },
    googleId: {
        type: String,
        default: null
        // sparse: true,
    },
    password: {
        type: String,
        required: false
    },
    is_verified: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    addresses: [{    //for multiple address
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Address' 
    }], 

}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields to your documents
});

module.exports = mongoose.model('User', userSchema);



