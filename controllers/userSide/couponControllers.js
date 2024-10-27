const Cart = require('../../model/cartModel')
const Coupon = require('../../model/couponModel')

/************************************       COUPON VALIDATE     ****************************************************** */
const validateCoupon = async(req,res)=>{
    try {
       
        const couponId = req.body.couponId
        const userId = req.session.user_id

        const coupon = await Coupon.findById(couponId)
        const userCart = await Cart.findOne({user : userId})

        if(!coupon || !userCart ){
            console.log('coupon verification failed cz coupon not found')
            return res.status(404).json({
                success : false    
            })
        }

        // if (coupon.expiryDate && coupon.expiryDate < new Date()) {
        //     return res.status(400).json({ message: 'Coupon has expired.' });
        // }

        if(userCart.totalSalePrice < coupon.minPurchaseAmount){
            return res.status(400).json({
                success : false,
                message :`Your cart total is below ₹${coupon.minPurchaseAmount}. Add more items to your cart to enjoy the discount!`
            })
        }

        const userFound = coupon.usedBy.find(user => user.toString() === userId.toString());
        if (userFound ) {
            return res.status(400).json({
                success: false,
                message: 'You have already used this coupon'
            });
        }

        if(coupon.usageLimit <= 0){
            coupon.isActive = false 
            await coupon.save()
            return res.status(400).json({
                success: false,
                message: 'This coupon has reached its usage limit'
            });

        }
        
        const discountAmount = Math.floor(userCart.totalSalePrice * (coupon.discountPercentage / 100));
        const appliedDiscount = Math.min(discountAmount, coupon.maxCapAmount);
        
        // userCart.discount = appliedDiscount;
        userCart.totalSalePrice = userCart.totalSalePrice - appliedDiscount;
        
        await coupon.save()
        await userCart.save() 
    
        
        res.status(201).json({
            success : true,
            message : 'Coupon Applied ', 
            cart : userCart
        })

    } catch (error) {
        console.error('validateCoupon', error);
        res.status(500).redirect('/error')
    }
}


module.exports = {
    validateCoupon,
}