
const User = require('../../model/userModel');
const Wallet = require('../../model/walletModel')
const logger = require('../../helpers/winstonLogger');

const Razorpay = require('razorpay'); 
const crypto = require('crypto');
/********************************************************************************************************************* */
//Razorpay intigration
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/*************************************************     USER WALLET     ********************************************************************* */
const userWalletPage = async(req,res)=>{
    try {
        const wallet = await Wallet.findOne({user : req.session.user_id})
        
        if(wallet){
            wallet.transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        
        res.render('userWallet',{wallet})
        
    } catch (error) {
        logger.error(error.message);
        return res.status(500).redirect('/error')
    }
}
/*************************************************     ADD MONEY TO WALLET     ********************************************************************* */
const addMoney = async(req,res)=>{
    try {

        const amount = req.body.amount 

    
        if (!amount) {
            return res.status(404).json({
                message: 'Amount is Missing '
            });
        }

        const user = await User.findById(req.session.user_id);
        if (!user) {                            
            return res.status(404).json({
                message : 'User  Not FOund '
            })
        }

        const razorpayOrder = await razorpayInstance.orders.create({
            amount: amount * 100, // amount in paise
            currency: 'INR',
            payment_capture: 1,
        });

        let wallet = await Wallet.findOne({ user : req.session.user_id })

        if(!wallet){
            wallet = new Wallet({
                user : req.session.user_id,
                transactions : [],
            })
        }

        const walletTransaction = {
            amount : amount,  // this amount is the amount  which came from frontend (req.body.amount )
            status : 'pending',
            type : 'credit',
            razorpayOrderId : razorpayOrder.id
        }

        wallet.transactions.push(walletTransaction)
        await wallet.save()


        res.status(201).json({
            success : true ,
            razorpayKeyId : process.env.RAZORPAY_KEY_ID,
            razorpayOrder: razorpayOrder,
            userPhone : user.mobile,
        })

    } catch (error) {
        logger.error(error.message);
        return res.status(500).redirect('/error')
    }
}
/************************************************************   VERIFY WALLET PAYMENT     **********************************************/
const verifyWalletPayment = async(req,res)=>{
    try {
        
        const wallet = await Wallet.findOne({user : req.session.user_id})
                
            if(!wallet){
                return res.status(404).json({
                    message : 'wallet  Not FOund '
                })
            }

            const { razorpayPaymentId, razorpayOrderId, razorpaySignature  } = req.body;

            const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest("hex")

            if(generatedSignature === razorpaySignature){

                const transaction = wallet.transactions.find((transaction)=>{
                    return transaction.razorpayOrderId === razorpayOrderId
                })

                transaction.status="success",
                transaction.razorPaymentId = razorpayPaymentId

                wallet.balance += transaction.amount
                await wallet.save()

                return res.status(201).json({ success: true, message: 'Payment verified successfully'});

            }else{
                
                const transaction = wallet.transactions.find((transaction)=>{
                    return transaction.razorpayOrderId === razorpayOrderId
                })

                transaction.status="failed",
                transaction.razorPaymentId = razorpayPaymentId
                await wallet.save()

                return res.status(400).json({ success: false, message: 'Payment Failed , if Money debited it will be credited with in 48(Working Hour)Hrs ' });
            }
    } catch (error) {
        logger.error(error.message);
        return res.status(500).redirect('/error')
    }
}
/******************************************************************************************************************************************* */
const verifyWalletPaymentFailed = async (req,res)=>{
    try {       
        
        const wallet = await Wallet.findOne({user : req.session.user_id})
                
        if(!wallet){
            return res.status(404).json({
                message : 'wallet  Not FOund '
            })
        }


        const paymentError = req.body.error


        const transaction  = wallet.transactions.find((transaction)=>{
            return transaction.razorpayOrderId ===  paymentError.metadata.order_id
        })


        transaction.status = 'failed',
        transaction.razorPaymentId = paymentError.metadata.payment_id
        
        await wallet.save()

    } catch (error) {
        logger.error(error.message);
        return res.status(500).redirect('/error')
    }
}

module.exports={
    userWalletPage,
        addMoney,
        verifyWalletPayment, 
        verifyWalletPaymentFailed,
}