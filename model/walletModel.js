const mongoose = require ('mongoose')


const walletTransaction = new mongoose.Schema({
    // order : {
    //     type : mongoose.Schema.Types.ObjectId,
    //     ref  : "Order",
    //     required : false
    // },
    amount : {
        type : Number,
        required : true,
    },
    status : {
        type : String,
        enum : ['pending' , 'success' , 'failed'],
        default : 'pending'
    },
    type : {    //Transaction Type: Whether the transaction is a 
        type : String,
        enum : ['debit' , 'credit']  //credit (adding money) or debit (spending money).
    },
    razorPaymentId : {
        type : String,
    },
    razorpayOrderId : {
        type : String,
    }
},{
    timestamps : true
}) 

const walletSchema = new mongoose.Schema({
    user : { 
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true 
    },

    balance : {
        type : Number,
        required :  true,
        default : 0 
    },

    transactions : [walletTransaction] ,

},{
    timestamps : true
})


module.exports = mongoose.model('Wallet', walletSchema);
