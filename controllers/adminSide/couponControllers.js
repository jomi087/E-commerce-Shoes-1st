
const Coupon = require('../../model/couponModel')

/*********************************      COUPON MANAGEMENT    *************************************/
const couponMangementPage = async(req,res)=>{
    try {
        
        const allCoupons = await Coupon.find({ })
        res.render('couponManagement',{coupons : allCoupons})

    } catch (error) {
        console.error('Error in couponMangementPage :', error);
        res.status(500).redirect('/error');
    }
}
/***********************************     ADDING  COUPON       ************************************ */
const addCoupon = async(req,res)=>{
    try {
        const {couponCode,discountAmount,minPurchaseAmount,maxCapAmount,usageLimit}=req.body

        const newcoupon = new Coupon({
            code : couponCode,
            discountPercentage : discountAmount,
            minPurchaseAmount : minPurchaseAmount,
            maxCapAmount : maxCapAmount,
            usageLimit :  usageLimit,
        })

        const newAddedCoupon = await newcoupon.save()

        if(!newAddedCoupon){
            return console.log('newAddedCoupon not found')
        }

        res.status(201).json({
            success: true
        })

    } catch (error) {
        console.error('Error in addCoupon :', error);
        res.status(500).redirect('/error');
    }
}
/**********************************      EDIT COUPON PAGE     *************************************** */
const editCouponPage = async(req,res)=>{
    try {
        const coupon = await Coupon.findById(req.params.id)
        if(!coupon){
            console.log('coupon is not found')
            return
        }

        res.render('updateCoupon',{coupon})
    } catch (error) {
        console.log('editCouponPage', error);
        res.status(500).redirect('/error');
    }
}
/************************************      EDIT COUPON       **************************************************** */
const editCoupon = async(req,res)=>{
    try {
        const {couponId,editcouponCode,editdiscountAmount,editminPurchaseAmount,editmaxCapAmount,editusageLimit,}=req.body

        const coupon = await Coupon.findByIdAndUpdate(couponId,{
            code:editcouponCode,
            discountPercentage:editdiscountAmount,
            minPurchaseAmount :editminPurchaseAmount,
            maxCapAmount :editmaxCapAmount,
            usageLimit: editusageLimit
        },{new : true})

        if(!coupon){
            console.log('coupon updation failed')
            return res.status(400).json({
                success : false,
                message: 'Coupon update failed',
            })
        }

        res.status(201).json({
            success : true ,
            message: 'Coupon updated',
        })

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
}
/*********************************      DELETE COUPON        ********************************************* */
const deleteCoupon = async(req,res)=>{
    try {
        const couponId = req.body.couponId

        await Coupon.findByIdAndDelete(couponId)

        res.status(201).json({
            success: true
        })

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
}

module.exports={
    couponMangementPage,
    addCoupon,
    editCouponPage,editCoupon,
    deleteCoupon,

}