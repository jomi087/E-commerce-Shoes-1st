const User = require('../../model/userModel');
const Product = require('../../model/productModel')
const Order = require('../../model/orderModel')
const Wallet = require('../../model/walletModel')
const Coupon = require('../../model/couponModel')


const PDFDocument = require('pdfkit');
const Razorpay = require('razorpay'); 
// const crypto = require('crypto');


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

            let temp =  orderData.totalSalePrice + orderData.coupon.discount
            
            orderData.totalSalePrice = temp - (item.salePrice * item.quantity)
            temp = orderData.totalSalePrice
           
           if(orderData.totalSalePrice < coupon.minPurchaseAmount){     //doubt over here does it should be  orderData.totalSalePrice  or orderData.actualPrice
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
        if(orderData.paymentMethod == 'razorpay'||orderData.paymentMethod == 'wallet'){
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
                wallet.balance =  wallet.balance + (refundAmouut * item.quantity)
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
/*****************************************************        RETRY FAILED ONLINE PAYMENT     ***********************************************************/
const retryPayment = async(req,res)=>{
    try {
        const orderId = req.body.orderId

        const user = await User.findById(req.session.user_id);
        
        const order = await Order.findById(orderId).populate('coupon.id')
        if(!order){
            console.log('order not found')
            return res.status(404).json({
                success: false,
                message: 'Retry Payment is not Possible for this Order'
            });
        }

        if(order.paymentMethod != "razorpay" ){
            console.log('paymentMethod is not razorpay ')
            return res.status(404).json({
                success: false,
                message: 'Retry Payment is not Possible for this Order'
            });            
        }
        
        if(order.coupon && order.coupon.id){           
            const coupon = await Coupon.findById(order.coupon.id)

            let foundUser = coupon.usedBy.find(user =>user.toString() === req.session.user_id);
            console.log(`This user (${foundUser}) has alredy used this coupon`)
            if(foundUser){
                return res.status(404).json({
                    success: false,
                    message: 'Retry Payment is not Applicable cz of used coupon'
                });  
                //instead of i can use alogic a repayment of actual price logic
            }
        }

        const razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options ={
            amount: order.totalSalePrice * 100, // amount in paise
            currency: 'INR',
            receipt: order._id.toString(),
            payment_capture: 1,
        }

        razorpayInstance.orders.create(options, function(err, razorpayOrder) {
            //console.log(razorpayOrder)
            console.log(err)
            res.status(201).json({
                success : true,
                orderId: razorpayOrder.id,  // generated by razorpay at razorpayInstance.orders.create({....})
                amount: razorpayOrder.amount,
                razorpayKeyId: process.env.RAZORPAY_KEY_ID,
                userName : user.firstName,
                userEmail : user.email,
                userPhone : user.mobile,
                order
            }); 
        })
        
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/********************************************************          INVOICE DOWNLOAD          ************************************************* */
const invoiceDownload = async(req,res)=>{
    try {
        const order = await Order.findById(req.params.id).populate('user') 
        const doc = new PDFDocument();   

        let filename = `INVOICE_${new Date().toISOString()}.pdf`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/pdf');
                
        doc.fontSize(20).text('INVOICE', { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(12).text('Sold By: Fashion Feet',{ align: 'center' });
        doc.text('GSTIN: 0000000001 | FSSAI License No: 0000000001',{ align: 'center' });
        doc.moveDown();


        // Order ID and Date
        doc.fontSize(12).text(`Invoice ID: #FFF${order._id}`,{ align: 'center' })
        doc.moveDown();
        doc.fontSize(12).text(`Details for Order ID: `, { continued: true, align: 'left'  })
        doc.text(`Order Date: `, { align: 'right' });
        doc.text(`${order._id}`, { continued: true, align: 'left'  })
        doc.text(`${new Date(order.orderDate).toLocaleDateString()} `, { align: 'right' });
        doc.moveDown(1.5);

        // Draw a line
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Customer and Delivery Info
        doc.font('Helvetica-Bold').fontSize(14).text('Customer', 50, doc.y);
        doc.font('Helvetica').fontSize(10).text(order.user.firstName + ' ' + order.user.lastName);
        doc.text(order.user.email);
        doc.text(order.user.mobile);

        doc.font('Helvetica-Bold').fontSize(14).text('Deliver to', 205, doc.y - 55);
        doc.font('Helvetica').fontSize(10).text(`Name: ${order.shippingAddress.name} `, 205);
        doc.text(`City: ${order.shippingAddress.locality} ${order.shippingAddress.district}`, 205);
        doc.text(`Address: ${order.shippingAddress.address}`,205);
        doc.text(`Pincode: ${order.shippingAddress.pincode}, ${order.shippingAddress.state}`, 205);
        doc.text(`Phone: ${order.shippingAddress.phone}`, 205);
        doc.moveDown(1.5);

        // Payment Info
        doc.font('Helvetica-Bold').fontSize(14).text('Payment Info', 410, doc.y - 100);
        doc.font('Helvetica').fontSize(10).text(`Payment Method: ${order.paymentMethod} `, 415);
        doc.text(`Payment ID: ${order.paymentId || 'COD'}`, 415);
        doc.text(`Status: ${order.paymentStatus}`, 415);
        doc.moveDown();
      
        doc.fontSize(14).text('Product', 30, 350);
        doc.text('Unit Price', 200, 350);
        doc.text('Quantity', 300, 350);
        doc.text('Status', 400, 350);
        doc.text('Total', 500, 350);

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

        order.items.forEach((item,i)=>{
            const y = 370 + i * 30;
            doc.fontSize(12).text(item.productName, 30, y);
            doc.text(item.salePrice, 200, y);
            doc.text(item.quantity, 300, y);
            doc.text(item.OrderStatus, 400, y);
            doc.text(item.salePrice * item.quantity , 500, y);
           
        })
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
 
        let startY = 370 + order.items.length * 30 + 30; // Adjust the "+ 20" if you want more space

        // Subtotal
        doc.fontSize(10).text(`Subtotal:`, 400, startY);
        doc.text(`${order.totalSalePrice}`, 500, startY);

        // Delivery Charge
        startY += 15; // Move down by 15 (or adjust as needed)
        doc.text(`Delivery Charge:`, 400, startY);
        doc.text(`0.00`, 500, startY);

        // Coupon
        startY += 15;
        doc.text(`Coupon:`, 400, startY);
        doc.text(`${order.coupon.discount|| "0.00" }`, 500, startY);

        doc.moveTo(400, doc.y).lineTo(550, doc.y).stroke();
        // Grand Total
        startY += 20; // Slightly larger space for emphasis
        doc.fontSize(14).text(`Grand Total:`, 400, startY);
        doc.text(`${order.totalSalePrice}`, 500, startY);

        doc.end();
        doc.pipe(res);
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
}


module.exports={
    orderHistory,
        orderCancellation,
        orderReturn,
        retryPayment,
        invoiceDownload,
}
