const mongoose = require ('mongoose')

const addressSchema = new mongoose.Schema({
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
    isDefault: {
        type: Boolean,
        default: false
    },

})

module.exports = mongoose.model('Address', addressSchema);