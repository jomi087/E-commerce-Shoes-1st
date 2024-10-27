const Product = require('../../model/productModel')
const Order = require('../../model/orderModel')
const Wallet = require('../../model/walletModel')
const Coupon = require('../../model/couponModel')
/*************************************************       ORDER HISTORY        ****************************************************************** */
const orderHistory = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const searchTerm = req.query.search || null;
        const searchStatus = req.query.orderStatus || null;

    // const searchCondition = searchTerm ?  {user: userId,"items.productName": new RegExp(searchTerm, 'i')}:{ user: userId }  //ternary way

        let searchCondition = { user: userId };

        if (searchTerm) {
            searchCondition = {
                user: userId,
                "items.productName": new RegExp(searchTerm, 'i'),
            };
        }

        if(searchStatus){
             searchCondition = {
                user: userId,
                "items.OrderStatus": searchStatus
            };
        }

        let userOrders = await Order.find(searchCondition).sort({ orderDate : -1 })

        //console.log('userOrders',userOrders);  // a problem -> the usrOrders wil be a full documet , to get specific item  logic is to filter out the items ie,
        // If a search term is provided, filter out items that don't match the product name
        // this over here is only applicable cz items are in  array

        if (searchTerm) {
            userOrders = userOrders.map(order => {   
                const filteredItems = order.items.filter((item) => {   // storing the  speacific searced base item to new array of item named -> filteredItems 
                   return item.productName.toLowerCase().includes(searchTerm.toLowerCase()) 
                })
            return { ...order.toObject(), items: filteredItems };// Return the order with filtered items
            });
        }

        if (searchStatus) {
            userOrders = userOrders.map(order => {   
                const filteredItems = order.items.filter((item) => { 
                   return item.OrderStatus.toLowerCase().includes(searchStatus.toLowerCase()) 
                })
            return { ...order.toObject(), items: filteredItems };
            });
        }

        // Render the filtered orders
        res.render('userOrder', { orders: userOrders ,searchTerm,searchStatus});
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
}
/**********************************************     ORDER CANCELLETION     ******************************************************* */
const orderCancellation = async(req,res)=>{
    try {
        
        const orderId = req.body.orderId
        const itemId = req.body.itemId

        const reason = req.body.reason

        // console.log(reason);

        const orderData = await Order.findById(orderId)
        if(!orderData){
            return res.status(400).json({
                success : false,
                message : 'OrderId NOt FOund'
            })
        }

        const item = orderData.items.find(item => item._id.toString() === itemId);
        if (!item) {
            return res.status(400).json({
                success: false,
                message: 'Item not found in the order',
            });
        }

        const productData = await Product.findById(item.product)
        if (!productData ) {
            return res.status(400).json({
                success: false,
                 message: 'product not found ',
            })
        }

        // *small bugs after payment is successful , reason is getting stored in db and reason is  (reason : paymentnot completed ) no need of reason after payment completion

       

        let refundAmouut = item.salePrice
        let  newDiscount

        if(orderData.coupon && orderData.coupon.id){
            const coupon = await Coupon.findById(orderData.coupon.id)
            if(!coupon){
                console.log("coupon not found while canceling a product")
                return  res.status(400).json({
                    success: false,
                    message: '',
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

        item.OrderStatus = 'Canceled';
        item.Reason = reason;  
        productData.unitsInStock += item.quantity

        const allItemsCanceled = orderData.items.every(i => i.OrderStatus === 'Canceled');
         if (allItemsCanceled) {
             orderData.paymentStatus = 'Canceled';
             orderData.totalSalePrice = 0; 
             orderData.coupon = null;
         }

        await orderData.save();
        await productData.save();

        let displayMessage = 'Order item has been successfully cancelled'
        if(orderData.paymentMethod == 'razorpay'){
            const walletTransaction = {
                amount : refundAmouut * item.quantity,
                status :  'success' ,
                type :  'credit',
                razorPaymentId : orderData.paymentId
            }

            let wallet = await  Wallet.findOne({user : req.session.user_id})
            if(!wallet){
                wallet = new Wallet({
                    user : req.session.user_id,
                    balance : walletTransaction.amount,
                    transactions : [walletTransaction],
                })
                await wallet.save()
                displayMessage = 'Order item cancelled ,Your Money has beeen added to your Wallet'
            }else{
                wallet.transactions.push(walletTransaction)
                wallet.balance =  wallet.balance + (item.salePrice * item.quantity)
                await wallet.save()
                displayMessage = 'Order item cancelled ,Your Money has beeen added to your Wallet'
            }
        }
        res.status(200).json({
            success: true,
            message: displayMessage ,
        });

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/***********************************************     ORDER RETURN        ********************************************************************/
const orderReturn = async(req,res)=>{
    try {
    const orderId = req.body.orderId
    const itemId = req.body.itemId
    const reason = req.body.reason

    console.log(orderId,reason,itemId);

    const orderData = await Order.findById(orderId)

    if(!orderData){
        return res.status(400).json({
            success : false,
            message : 'OrderId NOt FOund'
        })
    }

    const item = orderData.items.find(item => item._id.toString() === itemId)
    // console.log(item);

     if (!item) {
            return res.status(400).json({
                success: false,
                message: 'Item not found in the order',
            });
        }
    
    const currentDate = new Date()
    const deliveryDate = new Date(item.deliveryDate)

    // console.log("currentDate :",currentDate );
    // console.log("deliveryDate :",deliveryDate );
    // console.log("diffenrceInDay in milliseonds :",currentDate-deliveryDate );

    //convert milliseconds into days (by dividing the diffrence  millisecond and with a fullday's-milliseconds which is 1000 (milliseconds) * 60 (seconds) * 60 (minutes) * 24 (hours) = 86,400,000 milliseconds per day.)
    const differnceInDays = Math.floor((currentDate - deliveryDate) / (1000 * 60 * 60 * 24))   
    console.log('differnceInDays',differnceInDays);

    if(differnceInDays > 7){
    return res.status(400).json({
            success: false,
            icon : 'info',
            message: 'Return is not possible as the item was delivered more than 7 days ',
        });
    }

    item.OrderStatus = "Return-initiated"
    item.Reason = reason

    await orderData.save();

    res.status(200).json({
        success: false,
        icon : 'success',
        message: 'A return request has been sent to the Admin for approval ',
    });

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
                               
}
module.exports={
    orderHistory,
            orderCancellation,
            orderReturn,
}
