
const Product = require("../../model/productModel") //productControllers
const Order = require("../../model/orderModel")
const Wallet = require('../../model/walletModel')
const Coupon = require('../../model/couponModel')

/*********************************   ORDER MANAGEMENT PAGE   *****************************************/
const orderManagementPage = async(req,res)=>{
    try {

        const page = parseInt(req.query.page)
        const limit = 6 ; 
        const skip = (page - 1)*limit 

        const totalOrder = await Order.countDocuments(); 
        const orderData = await Order.find().populate('user').sort({ orderDate: -1 }).skip(skip).limit(limit)

        if(!orderData){
            console.log("orderManagementPage route responding");
            return res.render('errorCatch',{error : 'orderData Not Found'})
        }   
        res.render('orderManagement',{
            orders : orderData,
            currentPage : page, 
            totalPages: Math.ceil(totalOrder / limit)

        })

    } catch (error) {
        console.error('Error in orderManagementPage :', error);
        res.status(500).redirect('/error');
    }
}
/********************************* ORDER DETAILS   **********************************************/
const orderDetailPage = async(req,res)=>{
    try {
        const orderId = req.params.id
        // console.log(orderId);
        const orderData = await Order.findById(orderId).populate('user')
        // console.log(orderData);
        if(!orderData){
            console.log("orderDetailPage route not responding");
            return res.render('errorCatch',{error : 'orderData Not Found'})
        }  
        
        res.render('orderDetails',{order : orderData})

    } catch (error) {
        console.error('Error in orderDetailPage :', error);
        res.status(500).redirect('/error');
    }
}
/**********************************   ORDER UPDATE STATUS  ******************************************/
const orderUpdateStatus = async(req,res)=>{
    try {
        const orderId = req.params.id
        const status = req.body.status
        const itemId = req.body.itemId

        console.log(status)

        const orderData = await Order.findById(orderId)

        if(!orderData){
        console.log("orderUpdateStatus route not responding");
            return res.status(404).json({
                success: false,
                message: "Updating Failed , Order Id not Found"
            });
        }
        

        const item = orderData.items.find(item => item._id.toString() === itemId)
        
        if(!item){
        console.log("orderUpdateStatus route not responding");
            return res.status(404).json({
                success: false,
                message: "Updating Failed , Item not Found"
            });
        }

        if(item.OrderStatus === status){
            return res.status(404).json({
               success: false,
               message: "Already Updated"
           });
       }

        const product = await Product.findById(item.product)

        if(!product){
            console.log("orderUpdateStatus route not responding");
            return res.status(404).json({
                success: false,
                message: "Updating Failed , product not Found"
            });
        }

        item.OrderStatus = status

        if(item.OrderStatus === 'Delivered'){  
            item.deliveryDate = Date.now()
            orderData.paymentStatus = 'Paid'
        }

        if(item.OrderStatus === 'Returned'){

            let refundAmouut = item.salePrice
            let  newDiscount

            if(orderData.coupon && orderData.coupon.id){
                console.log("got in",orderData.coupon);
                
                const coupon = await Coupon.findById(orderData.coupon.id)
                if(!coupon){
                    console.log("coupon not found while updating the order status")
                    return  res.status(400).json({
                        success: false,
                        message: 'coupon not found',
                    });
                }
                orderData.totalSalePrice = orderData.actualSalePrice - (item.salePrice * item.quantity)
                orderData.actualSalePrice = orderData.totalSalePrice
               
               if(orderData.totalSalePrice < coupon.minPurchaseAmount){
                   coupon.usageLimit += 1;
                   refundAmouut = item.salePrice - orderData.coupon.discount 
                   orderData.coupon.id= null;
                   orderData.coupon.discount= 0;
               }else{
                   coupon.usageLimit += 1;
                   newDiscount = Math.floor(orderData.totalSalePrice * (coupon.discountPercentage/100)) 
                   newDiscount = newDiscount < coupon.maxCapAmount ?  newDiscount : coupon.maxCapAmount
                   refundAmouut = item.salePrice - (orderData.coupon.discount - newDiscount)
                   orderData.totalSalePrice =  orderData.totalSalePrice - newDiscount
                   orderData.coupon.discount = newDiscount;
               }
               await coupon.save();
            }else{
                orderData.totalSalePrice =  orderData.totalSalePrice - (item.salePrice * item.quantity)
            }
    
            orderData.paymentStatus = 'Refunded'
            product.unitsInStock += item.quantity
            await product.save()

            const walletTransaction = {
                amount : refundAmouut * item.quantity,
                status : 'success',
                type : 'credit',
                razorPaymentId : orderData.paymentId
            }

            let wallet = await Wallet.findOne({user : orderData.user})
            if(!wallet){
                wallet = new Wallet({
                    user : orderData.user,
                    balance : walletTransaction.amount,
                    transactions : [walletTransaction]
                })
                await wallet.save()
            }else{
                wallet.transactions.push(walletTransaction)
                wallet.balance =  wallet.balance + (item.salePrice * item.quantity)
                await wallet.save()
            }
        }
        
        await orderData.save()
        res.status(200).json({
            success: true
        });


    } catch(error) {
        console.error('Error in orderUpdateStatus :', error);
        res.status(500).redirect('/error');
    }
}
/*********************************     RETURN REQUEST      *****************************************/
const returnRequest = async(req,res)=>{
    try {
        const orderId = req.params.id
        const status = req.body.status
        const itemId = req.body.itemId

        console.log(status)

        const orderData = await Order.findById(orderId)

        if(!orderData){
        console.log("returnRequest route not responding");
            return res.status(404).json({
                success: false,
                message: "Updating Failed , Order Id not Found"
            });
        }

        const item = orderData.items.find(item => item._id.toString() === itemId)

        if(!item){
        console.log("returnRequest route not responding");
            return res.status(404).json({
                success: false,
                message: "Updating Failed , Item not Found"
            });
        }

        if(item.OrderStatus === status){
            return res.status(404).json({
                success: false,
                message: "Already Updated"
            });
        }

        item.OrderStatus = status

        await orderData.save()
        res.status(200).json({
            success: true
        });


    }catch (error) {
        console.error('Error in returnRequest :', error);
        res.status(500).redirect('/error');
    }
}



module.exports = {
    orderManagementPage,
    orderDetailPage,
    orderUpdateStatus,
    returnRequest
}

