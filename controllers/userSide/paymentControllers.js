const User = require('../../model/userModel');
const Product = require('../../model/productModel')
const Address = require("../../model/addressModel")
const Cart = require('../../model/cartModel')
const Order = require('../../model/orderModel')
const Coupon = require('../../model/couponModel')

const Razorpay = require('razorpay'); 
const crypto = require('crypto');


/*****************************************       CONFIRM ORDER PAGE    *********************************************************************/
const confirmOrderPage  = async(req,res)=>{
    try {

        const userCart = await Cart.findOne({user : req.session.user_id } ).populate('items.product')
        const user = await User.findById(req.session.user_id).populate('addresses')
        
        const allCoupon = await Coupon.find({isActive : true})

        // console.log(user);
        if(!user){
            return res.redirect('/logout')
        }

        if(userCart.totalSalePrice < userCart.actualSalePrice){
            return res.render('checkoutPage',{ 
                cart : userCart ,
                user ,
                coupon: allCoupon,
                couponApplied : true
            })
        }

        res.render('checkoutPage',{ 
            cart : userCart ,
            user ,
            coupon: allCoupon,
            couponApplied : false
        })

    } catch (error) {
        console.error(error);
        return res.status(500).redirect('/error')
    }
}

/**********************************************         ADD ADDRESS FROM CHECK OUT            ********************************************************************************************** */
const addAddressFromCheckout = async(req,res)=>{
    try {
        const userId = req.session.user_id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message:  'You have been logged out. Please log in again.'
            });
        }

        const address = new Address({
            name: req.body.name,
            phone: req.body.mobile,
            pincode: req.body.pincode,
            locality: req.body.locality,
            district: req.body.district,
            state: req.body.state,
            address: req.body.address,
        });

        const addressData = await address.save();

        if (!addressData) {
            return res.status(404).json({
                success: false,
                message:  'Adding Address failed, Try again..'
            });
        }

        user.addresses.push(addressData._id);
        await user.save();

        res.status(201).json({
            success: true,
            message:  'Address added Successfully'
        });

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}

/*********************************************     EDIT ADDRESS FROM CHECKOUT         ********************************************************************************************/
const editAddressFromCheckout = async(req,res)=>{
    try {
        const address = await Address.findOne({_id : req.body.addressID})
        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Updation Failed Address Not Found"
            });
        }

        const updateAddress = await Address.findByIdAndUpdate( req.body.addressID, {
            name : req.body.name,
            phone : req.body.mobile,
            pincode : req.body.pincode,
            locality : req.body.locality,
            district : req.body.city,
            state : req.body.state,
            address : req.body.address,
        },
            {new : true}
        )

        if(!updateAddress){
            return res.status(404).json({
                success: false,
                message: "Updating Failed , You have been Loged out"
            });
        }
        res.status(200).json({
            success: true,
            message: 'Address has been Updated Successfully'
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/******************************************    PAYMENT & ORDER CREATION(CHECKOUT)     ***************************************************************************************** */
const confirmOrder = async(req,res)=>{
    try {

        const couponId = req.body.couponId || null
    
        const paymentMethod = req.body.paymentMethod
        const selctedDeliveryAddressId = req.body.selectedAddressId 
        // console.log(selctedDeliveryAddressId);
    
        if (!paymentMethod || !selctedDeliveryAddressId) {
            return res.status(400).json({
                message: 'Payment method and address are required'
            });
        }

        const user = await User.findById(req.session.user_id);
        const cart = await Cart.findOne({ user: req.session.user_id }).populate({path: 'items.product',populate: { path: 'category' } });  // way to populated nested model

        if (!user || !cart) {                            
            return res.status(404).json({
                message : 'User or Cart  Not FOund '
            })
        }
    
        if(paymentMethod === 'cod' && cart.totalSalePrice > 1000){
            return res.status(404).json({
                message : 'COD IS NOT AVAILABE FOR AMOUNT MORE THAN 10k'
            })
        }

        const address = await Address.findById(selctedDeliveryAddressId);
        // console.log(address);
        
        if (!address) {
            return res.status(404).json({
                message : 'Invalid address selected '
            })
        }

        for (const item of cart.items) {
            const product = await Product.findById(item.product);

            if (!product) {
                console.log(`Product with ID ${item.product} not found`);
                return res.status(404).json({
                    message: `Product not found`
                });
            }

            if (product.unitsInStock < item.quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for ${product.productName}`
                });
            }
        }
        
        const orderItems = cart.items.map(item => ({
            product: item.product._id, //item?.product?._id,  recomended to use optional chaining
            productName: item.product.productName,
            quantity: item.quantity,
            regularPrice: item.regularPrice,
            salePrice: item.salePrice,
            size: item.size,
            color: item.color,
            images: item.product.images[0],
            category: item.product.category.name,   // to get the category from product  i have to populate it 
        }))

        let couponinfo = null

        if(couponId){
            couponinfo = {
                id : couponId,
                discount : cart.actualSalePrice - cart.totalSalePrice
            }
            if(couponinfo.discount == 0){
               couponinfo = null
            }
        }

        const  newOrder = new Order({
            user : req.session.user_id ,
            items : orderItems,    // orderItems is an array cz mentoioned in model
            shippingAddress : address  ,
            totalRegularPrice :  cart.totalRegularPrice ,
            discount : cart.discount,
            totalSalePrice  : cart.totalSalePrice ,
            actualSalePrice : cart.actualSalePrice,
            paymentMethod : paymentMethod ,
            coupon : couponinfo,
        
            
        })

        await newOrder.save()

        if (paymentMethod === 'razorpay') {

            //Razorpay intigration
            const razorpayInstance = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });

            const razorpayOrder = await razorpayInstance.orders.create({
                amount: newOrder.totalSalePrice * 100, // amount in paise
                currency: 'INR',
                receipt: newOrder._id.toString(),
                payment_capture: 1,
            });


            console.log('razorpayOrder',razorpayOrder)

            for(const item of newOrder.items){
                item.OrderStatus = 'Pending Payment'
                item.Reason = 'Payment Not Completed'
            }
            await newOrder.save();
            
            res.status(201).json({
                success : true,
                message: 'Razorpay order created successfully',
                orderId: razorpayOrder.id, // generated by razorpay at razorpayInstance.orders.create({....})
                amount: razorpayOrder.amount,
                razorpayKeyId: process.env.RAZORPAY_KEY_ID,
                userName : user.firstName,
                userEmail : user.email,
                userPhone : user.mobile,
                order :  newOrder
            });

            //waiting for the payment to be verify by Razorpay. You need to delete the cart after the payment is successfully verified, thats y cart is not deleted from here

        } else {   // for COD

            if(couponId){
                const coupon = await Coupon.findById(couponId)
                if(!coupon){
                    console.log('Coupon not found in confirm order')
                     return res.status(404).json({
                        success: false,
                        message: 'Coupon not found'
                    });
                }

                if(coupon.usageLimit <= 0){
                    coupon.isActive = false 
                    return res.status(404).json({
                        success: false,
                        message: 'This coupon has reached its usage limit'
                    });
                }

            

                coupon.usedBy.push(req.session.user_id)
                coupon.usageLimit = coupon.usageLimit-1
                await coupon.save()
            }
            

            for(const item of cart.items ){
                const product = await Product.findById(item.product)
                product.unitsInStock -= item.quantity;
                await product.save();       
            }

            await Cart.findOneAndDelete({ user: req.session.user_id });
            
            res.status(201).json({
                message: 'Order successfully placed',
            });
        }         
    } catch (error) {
        console.error(error);
        return res.status(500).redirect('/error')
    }
}
/******************************************************    /order/verify-status     *************************************************************************** */
const onDismissUpdateStatus = async(req,res)=>{
    try {
        const order = await Order.findById(req.body.orderId)

        if(!order){
            console.log('order not found')
            return res.json({
                success : false,
                message : "Somthing went Wrong ,try again later"
            })
        }

        if(order.paymentStatus == "Pending"){
            order.paymentStatus = 'Canceled'

            order.items.forEach(item => {
                if (item.OrderStatus === 'Pending Payment') {
                    item.OrderStatus = 'Canceled';
                    item.Reason = "Payment was canceled by User"
                }
            });
            await order.save();
        }

    } catch (error) {
        console.error(error);
        return res.status(500).redirect('/error')
    }
}
/******************************************************    FAILED PAYMENT    *********************************************************************/
const paymentFailed =async(req,res)=>{
    
    try {

        const orderId = req.body.orderId
        const paymentError = req.body.error

        console.log(paymentError.metadata.payment_id)

        const order = await Order.findById(orderId);

        if (order) {
            order.paymentStatus = 'Failed';
            // order.totalSalePrice = 0 ;
            order.paymentId = paymentError.metadata.payment_id;

            for(const item of order.items){
                item.OrderStatus = 'Canceled'
                item.Reason = paymentError.description
            }

            await order.save();

            return res.json({ success: false, message : paymentError.description })
        }else{
            return res.json({ success: false, message : 'Order not found' });
        }
    } catch (error) {
        
        console.error('Failed Payment Error:', error);
        return res.status(500).redirect('/error')
    }
}
/***************************************************    VERIFY ONLINE PAYMENT   *********************************************************/
const verifyPayment = async (req,res)=>{      //  Razorpay logic of verify payment ? => Q5* on pending
     try {
        console.log("hoi")
        const { razorpayPaymentId, razorpayOrderId, razorpaySignature ,orderId,couponId } = req.body;
        console.log('couponId',couponId);

         // console.log('razorpayPaymentId -', razorpayPaymentId)
        //  console.log('razorpayOrderId -', razorpayOrderId)
        //   console.log('razorpaySignature -', razorpaySignature)
        //    console.log('orderId -', orderId)

        const order = await Order.findById(orderId).populate('items.product')
        
        if(!order) {
            console.log('order not found')
            return res.status(400).json({ success: false, message: 'Order not found , try again later '});
        }

        let coupon

        if(couponId){
            coupon = await Coupon.findById(couponId)
            if(!coupon){
                return console.log('Coupon not found in confirm order')
            }

            if(coupon.usageLimit <= 0){
                coupon.isActive = false 
                await coupon.save();
                return res.status(400).json({
                    success: false,
                    message: 'This coupon has reached its usage limit'
                });
            }
        }

        // Create a signature hash using the same method as Razorpay
        const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');                                               // console.log('generatedSignature - ',generatedSignature)

        // Compare the generated signature with the received signature
        if (generatedSignature === razorpaySignature) {

            for (const item of order.items){
                const product = item.product
                // console.log(product);
                item.product.unitsInStock -= item.quantity
                await product.save();
                item.OrderStatus = 'Confirmed'
            }

            order.paymentStatus = 'Paid';
            order.paymentId = razorpayPaymentId
            await order.save();

            if(couponId){ 
                // coupon.usedBy.push(req.session.user_id)
                // coupon.usageLimit = coupon.usageLimit - 1
                await coupon.save()
            }
            
            await Cart.findOneAndDelete({ user: order.user });
                
            res.json({ success: true });
           
        } else {
            order.paymentStatus = 'Failed';
            order.orderStatus = 'Canceled';
            await order.save();

            return res.status(400).json({ 
                success: false,
                message: 'Payment verified Failed , if your money is debited it will be credited with 48hrs '
            });
        }
    } catch (error) {
        console.error('Payment Verification Error:', error);
        res.status(500).json({ success: false, message: 'Server error during payment verification' });
    }
}

module.exports={
    confirmOrderPage, 
        addAddressFromCheckout,
        editAddressFromCheckout,
        confirmOrder,
            onDismissUpdateStatus,
            paymentFailed,
            verifyPayment,
}