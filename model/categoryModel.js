const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    name : {
        type : String,
        required : true
    },
    discount : {
        type : Number,
        required : true,
        min : 1,
        max : 99,
    },
    startDate :{
        type : Date,
        required : true ,
    },
    endDate : {
        type : Date ,
        required : true ,
        validate: {
            validator: function(value) {
                return this.startDate < value;
            },
            message: "Expiry date must be later than the start date"
        }
    },
    description : {
        type : String,
        required:  true
    },
    status : {
        type : Boolean,
        default: false
    }
},{timestamps : true })

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required : true,
    },
    description : {
        type: String,
        required : true, 
    },
    isActive : {                      //soft delete
        type : Boolean,
        default : true
    },
    createdAt :{
        type : Date,
        default: Date.now,
    },
    offer : offerSchema,                //try next time to create a seperate offer model 
    offerHistory : [offerSchema]
}, { timestamps: true })


module.exports = mongoose.model("Category",categorySchema);






