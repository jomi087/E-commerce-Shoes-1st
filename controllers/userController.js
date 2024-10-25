


const User = require('../model/userModel');
const Otp = require('../model/otp') 
const Product = require('../model/productModel')
const Category = require("../model/categoryModel")
const Address = require("../model/addressModel")
const Wishlist = require("../model/wishListModel")
const Cart = require('../model/cartModel')
const Order = require('../model/orderModel')
const Wallet = require('../model/walletModel')
const Coupon = require('../model/couponModel')


const bcrypt = require('bcrypt');
const Razorpay = require('razorpay'); 
const crypto = require('crypto');

const nodeMailer = require('../helpers/mailer');
const {twoMinuteExpiry} = require('../helpers/otpValidate');
const {securePassword ,generateRandom4Digit,calculateCartTotals} = require('../helpers/utility')


/********************************************************************************************************************* */
//Razorpay intigration
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
/********************************************************************************************************************* */
//landing page  ( shorter way  using ternery ) (for regular way refer admin controllers -> usersDetails  )
const landingPage = async (req, res) => {
    try {
      const searchTerm = req.query.search || null;
      const searchCondition = searchTerm ? { productName: new RegExp(searchTerm, 'i'), forSale: true } : { forSale: true };  
  
      const productData = await Product.find(searchCondition).populate('category');
      const userData = await User.findOne({ _id: req.session.user_id });
  
      res.render('landingPage', {
        user: userData || null,
        product: productData,
        searchTerm,
      });
    } catch (error) {
      console.log(error.message);
      return res.status(500).redirect('/error');
    }
  };
/********************************************************************************************************************************* */
//shopPage

const Productspage = async (req,res) => {
    try {

        const searchTerm = req.query.search || null;
        const categoryBase = req.query.category || null 
        
        const sortOption = req.query.sort || '';

        console.log(categoryBase);
        

        let searchCondition = { forSale: true };

        if (searchTerm) {
            searchCondition.productName = new RegExp(searchTerm, 'i');
        }
        if (categoryBase) {
            searchCondition.category = categoryBase;
        }
        
        let sortCriteria = {};
        switch (sortOption) {
            case 'price_low_high':
                sortCriteria = { salePrice: 1 }; 
                break;
            case 'price_high_low':
                sortCriteria = { salePrice: -1 }; 
                break;
            case 'newest':
                sortCriteria = { dateAdded: -1 }; 
                break;
            case 'name_az':
                sortCriteria = { productName: 1 };
                break;
            case 'name_za':
                sortCriteria = { productName: -1 };
                break;
            case 'discount':
                sortCriteria = { discount: -1 }; 
                break;
            default:
                sortCriteria = {}; 
        }

     
        const allActiveProduct = await Product.find(searchCondition).sort(sortCriteria).populate('category')
        const allCategories = await Category.find({ isActive: true });
        const userData = await User.findOne({ _id: req.session.user_id });

        // Render the shop page with the sorted products
        res.render('shopPage', {
            user: userData || null,
            product: allActiveProduct,
            categories: allCategories,
            searchTerm,
            categoryBase,
            sortOption
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).redirect('/error');
    }
};
/*********************************************       PRODUCT DETAILS     ************************************************************************************/
//productDetails
const productDetails = async(req,res)=>{
    try {
        const id = req.query.id
        const specificProduct = await Product.findOne({_id :id}).populate('category')
        // console.log(specificProduct);

        const allProducts = await Product.find().populate('category')
        
        res.render('productDetailsPage',{ product : specificProduct , products : allProducts })

    } catch (error) {
        console.log(error.message);
        // return res.status(500).redirect('/error')
    }
}
/********************************************************************************************************************************************** */
const productWishListPage = async(req,res)=>{
    try {
        const userWishList = await Wishlist.findOne({ user : req.session.user_id }).populate('products')
        if(!userWishList){
            console.log('userWishList not found ')
        }
        res.render('userWishList',{userWishList})
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}

/******************************************************************************************************************************************* */
const addRemoveWishList = async(req,res)=>{
    try {
        const productId = req.body.productId
        const userId = req.session.user_id

        const existingItem = await Wishlist.findOne({user : userId , products : productId })

        if(existingItem){
            existingItem.products.pull(productId)
            
            await existingItem.save()
            return res.status(201).json({
                success : true ,
                action  : 'removed'
            })
        }else{
            let wishList = await Wishlist.findOne({user : userId })

            if(!wishList){
                wishList = new Wishlist({
                    user : userId,
                    products : [productId]
                })

            }else{
                wishList.products.push(productId)
            }
            await wishList.save()
            return res.status(201).json({
                success : true ,
                action  : 'added'
            })
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/**********************************************************    WISH-LIST STATUS UPDATE   ************************************************************************ */
const wishListStatusUpdate = async (req, res) => {    //not dynamicaly
    try {
        const userId = req.session.user_id;
        const wishlist = await Wishlist.findOne({ user: userId }).populate('products');
        // console.log(wishlist)
        const productIdsInWishlist = wishlist ? wishlist.products.map(product => product._id.toString()) : [];
        // console.log(productIdsInWishlist)
        return res.status(200).json({ productIdsInWishlist });
        
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
   
};
/***************************************************************     CART PAGE      ******************************************************************************* */
const cartPage = async(req,res)=>{
    try {
        

        const userCart = await Cart.findOne({user : req.session.user_id } ).populate('items.product') 
        // console.log(userCart);
        if (userCart) {
            
            for (const item of userCart.items) {
                const product = item.product; // Accessing the populated product directly
                // console.log(product);

                if (product) {
                    if (!product.OfferSalePrice) {
                        item.OfferSalePrice = product.salePrice; 
                    }else{
                        item.OfferSalePrice = product.OfferSalePrice; 
                    }
                }
            }
            calculateCartTotals(userCart);
            await userCart.save(); // Save the updated cart
        }

        const user = await User.findById(req.session.user_id)
        res.render('userCart', { cart : userCart , user  } )
            
    } catch (error) {
        console.log ( error.message );
        return res.status(500).redirect('/error')
    }
}
/*********************************************************************************************************************************** */
const addToCart = async(req,res)=>{
    try{

        const user_id = req.session.user_id
        const productId  =  req.body.product_id
        const size  =  req.body.shoeSize                // console.log(productId,size);

        const user = await User.findById(user_id)   
        const product = await Product.findById(productId)
        if(!user){
            return res.status(400).json({
                success :    false ,
                message : "You need to login first "
            }) 
        }
        if (!product) {
            return res.status(400).json({
                success:    false ,
                message : " Product Not Found ",
            }) 
        }
        if (!product.sizesAvailable.includes(size)) {
            return res.status(400).json({
                success:    false ,
                message : " Size is Not Availabe ",
            }) 
        }   
       
        let cart = await Cart.findOne({ user: user_id });       //console.log(cart);
        
        if (!cart) {
            cart = new Cart({ user: user_id });             // console.log('cartCreation',cart);
        }

        // this is for checking wether the product is already in the cart 
        const existingItemInCart = cart.items.findIndex(item =>                         //Q4 => findindex ?
            item.product.toString() === productId // && item.size === size 
        ); // if (not equal){} then it will return  -1 (that mean that product has not been added to  cart)  }  else { it wil return that index where it found that consition(1st found)}
        
        //console.log(existingItemInCart);
        
        if(existingItemInCart === -1){

            const newItem ={             //storing product item  & pushing to cart Items[] model
                product : product._id,
                quantity : 1,
                regularPrice : product.regularPrice,
                salePrice : product.salePrice,
                OfferSalePrice : product.OfferSalePrice || undefined,
                size : size ,
                color : product.primaryColor

            };
            cart.items.push(newItem)                                          
            // console.log('cart-items',cart.items);

        }else{
            return res.status(400).json({
                success:    false ,
                message : " ! Product already Added To Cart " 
            })
        }
       
        calculateCartTotals(cart);
        await cart.save() 
            
        res.status(200).json({
            success:    true ,
            message : " ✓ Product Added To Cart " 
        }) 

    }catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')     
    }
}
/****************************************************************************************************************************************/
const updateQuantity = async(req,res)=>{
    try {
        const itemId = req.body.itemId 
        const change = req.body.change
        
        
        const cart = await Cart.findOne({ user : req.session.user_id}).populate('items.product')

        //  console.log(cart);
        if(!cart){
            return res.status(404).json({message : 'Cart not Found'})
        }

        //finding the item 

        //This method is handy if you're using Mongoose and items is a subdocument array. The .id() method looks up a subdocument by its _id:
        // const item = cart.items.id(itemId); // else (regular my-way given below)

        const item = cart.items.find((item)=>{  
            return item._id.toString() === itemId
        })                                            //console.log(item);

        const newQuantity = item.quantity + change;

        if (newQuantity < 1) {
            item.quantity = 1; 

        } else if (newQuantity > item.product.unitsInStock) {

            item.quantity = item.product.unitsInStock; // Cap quantity at available stock
            return res.json({
                cart:cart,
                quantity: item.quantity,
                msg: `Only ${item.product.unitsInStock} units available.`
            });
        } else if (newQuantity > 3) {
            item.quantity = 3; 
            return res.json({
                cart:cart,
                quantity: item.quantity,
                msg: `You can only buy a maximum of 3 units of this product.`
            });
        } else {
            item.quantity = newQuantity; 
        } 
       
        calculateCartTotals(cart);
        await cart.save();

        res.json({
            cart :cart,
            quantity : item.quantity,
            msg : ''
         })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message : 'Server error '})
        
    }
}
/************************************************************************************************************ */
const removeproduct = async (req, res) => {
    try {
    const itemId = req.body.itemId; 
        
    const cart = await Cart.findOneAndUpdate(
        {'items._id' : itemId },
        { $pull : { items : { _id : itemId }}},
        {new:true})

        console.log(cart);
        
  
      if (!cart) {
        return res.status(404).json({
            message: 'Item not found in cart'
        });
      }
      calculateCartTotals(cart);
      await cart.save();
      
      res.status(200).json({ 
        cart:cart,
        message: 'Item removed successfully' });

    } catch (error) {

      console.error(error);
      res.status(500).json({ message: 'An error occurred while removing the item' });
    }
  };
  
/*********************************************************************************************************************************/
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
            coupon : couponinfo
        })

        await newOrder.save()

        if (paymentMethod === 'razorpay') {

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
/******************************************************    FAILED PAYMENT    *********************************************************************/
const paymentFailed =async(req,res)=>{
    
    try {

        const orderId = req.body.orderId
        const paymentError = req.body.error

        console.log(paymentError.metadata.payment_id)

        const order = await Order.findById(orderId);

        if (order) {
            order.paymentStatus = 'Failed';
            order.totalSalePrice = 0 ;
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
        const { razorpayPaymentId, razorpayOrderId, razorpaySignature ,orderId,couponId } = req.body;
        console.log(couponId);
        

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
                coupon.usedBy.push(req.session.user_id)
                coupon.usageLimit = coupon.usageLimit - 1
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
/************************************************************************************************************************************ */
// Signup page
const loadSignup = async(req,res)=>{
    try {
        res.render('signupPage')
    } catch (error) {
        console.log(error.message);
         return res.status(500).redirect('/error')
    }
}
/************************************************************************************************ */

//send Mail( of otp) & storing Otp in db
const sendMailOtp = async (req, res) => {

    try {
        const existingEmail = await User.find({email:req.body.email})  //these will return a value ( [] ) so it will be true      
        // console.log(existingEmail); 
        
        if (existingEmail.length > 0) {       //thts y i used existingEmail.length > 0    
            return res.status(400).json({
            success:false,
            msg:"Email already exists. Please use a different email."
            })  
        }

        const g_otp=await generateRandom4Digit()  //g_otp => generate-otp

        const oldOtpData = await Otp.findOne({user_id : req.body.email})
        console.log(oldOtpData);
        

        if(oldOtpData){
            const sendNextOtp = await twoMinuteExpiry(oldOtpData.timestamp) //recent otp time of that user
                // console.log(sendNextOtp) 
                // console.log(!sendNextOtp) 
            if(!sendNextOtp){ 
                  console.log("expire time not exided");
                    return res.status(400).json({
                    success:false,
                    msg:"An Otp already has been send to your mail"
                })  
            }else{
                console.log("expiry time exided");
                res.status(200).json({ 
                success:true,       
                msg:"An OTP has been sent to your email" 
                })
            }  
        }
        const cDAte = new Date() //cDAte => current-Date

        const otpData = await Otp.findOneAndUpdate( //this is used for updating the otp  form the document which  has same email 
            {user_id : req.body.email},
            {otp     : g_otp , timestamp : new Date(cDAte.getTime())},
            {upsert  : true , new : true , setDefaultsOnInsert : true }
            /* upsert works same as update jst add-on feature is that if that perticular field is not 
            available then it will create one document  cz of  this (line no 49th code(upsert:......)) code
            i dont need write a code to insertOne document  and (for adding (saving )new document ) 
            which i have commented from line number 57 to 61(insertOne code)*/
        )
        console.log(otpData);
        
        // const enter_otp = new Otp({  //this work as insertOne  
        //     user_id:req.body.email,
        //     otp    : g_otp,
        // })
        //await enter_otp.save()

        const Useremail = req.body.email; //can i move this to the line after 42 and use Useremail insted of req.body.email ?
        const subject = 'OTP VERIFICATION..!';
        const msgToUser = `<p>Use OTP:-<h3>${g_otp},</h3><br>To verifiying your Mail ,<br> DO-Not Share this code with anyone</p>`;

        nodeMailer.sendMaiL(Useremail, subject, msgToUser);
        console.log('email sent successfully');
        res.status(200).json({ 
            success:true,     
            msg:"An OTP has been sent to your email" 
            })
    
    } catch (error) {

        console.log('Failed to send  email', error.message);
        return res.status(500).redirect('/error')
    }
};
/********************************************************************************************************************** */

//verify-Otp for mail verification 
const verifyOtp= async (req,res) => {
    try {

        const email = req.body.email
        const otp = req.body.otp

        const otpData = await Otp.findOne({user_id : email})
        
        if(otpData && otpData.otp==otp){
            
            console.log("Otp is Correct");
                res.status(200).json({
                success:true
            })
        }else{
            console.log("Otp is Not Correct");
               return res.status(400).json({
                success:false,
            })
        }
    } catch (error) {
        console.log('Failed to verify otp:-', error.message);
        // return res.status(500).redirect('/error')
        
    }
}
/********************************************************************************************************************* */

//Storing  users in database
const  insertUser = async(req,res)=>{
    try {
        // await Otp.deleteOne({user_id : req.body.email})     //??????????????is this required????????????
       
        const existingMob = await User.findOne({ mobile: req.body.mob });
        if (existingMob) {
            res.render('signupPage', { txt:'Mobile number already exists.Please use a different Number.' });
            return;
        }

        const spassword =await securePassword(req.body.password)
        

        const user=new User({
        firstName : req.body.fname,
        lastName : req.body.lname,
        email : req.body.email,
        mobile : req.body.mob,
        password : spassword, 
        is_verified : true,
        is_admin : 0
        })

        const userData= await user.save()
        console.log(`new User  => ${userData}`);
        console.log(`password = ${req.body.password}`);

        if(userData){
            res.render('signupPage',{message:'Account Creation has been Success-Full,You Can login Now'})
        }else{
            res.render('signupPage',{message:' Sign-Up Failed,Please check with our team-members'})
        }

    } catch (error) {
        console.log(error.message);
        // return res.status(500).redirect('/error')
    }
}

/********************************************************************************************************************* */
// login page 
const loadLogin = async(req, res) => {
    try {
        res.render('userLogin');
    } catch (error) {
        console.error('Error in loadLogin:', error.message);
        return res.status(500).redirect('/error');
    }
};

/********************************************************************************************************************* */
//verify login user
const verifyLogin = async(req,res)=>{
    try {
        const useremail = req.body.email
        const password = req.body.password

        // console.log(useremail,password);

        const userData = await User.findOne({isAdmin : false , email:useremail})
        // console.log(userData);

        if(userData){
            if(userData.isBlocked){
                    res.render('userLogin',{message:"Your A/C has been Blocked"})
            }else{
                const passwordMatch =  await bcrypt.compare(password,userData.password)
                if(passwordMatch ){
                    req.session.user_id = userData._id
                    res.redirect('/')
                }else{
                    res.render('userLogin',{message:"Invalid email & Password"})
                }
            }
        }else{
            res.render('userLogin',{message:"Invalid Email & password"})
        }
    } catch (error) {
        console.log(error.message);
        // return res.status(500).redirect('/error')
    }
}
/****************************************       FORGOT PASSWORD      ********************************************************************/
 const forgotPasswordPage = async(req,res)=>{
    try {
        res.render('forgotPassword')
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
 }
/*****************************************     RESET PASSWORD OTP     *****************************************************/
const verifyPasswordOtp = async(req,res)=>{
   try {
        const existingEmail = await User.find({email:req.body.email})  //fimd will return a value  in an array even if it dosent get anu value  still there but the value(  ie [] empty array  ) so it will be true      
        console.log(existingEmail); 
        
        if (existingEmail.length === 0) {  
            return res.status(400).json({
            success:false,
            msg:"Email Not Found"
            })  
        }

        const oldOtpData = await Otp.findOne({user_id : req.body.email})
        console.log(oldOtpData);

        if(oldOtpData){
            const sendNextOtp = await twoMinuteExpiry(oldOtpData.timestamp) //recent otp time of that user 
            if(!sendNextOtp){ 
                  console.log("expire time not exided");
                   return res.status(200).json({
                    success:false,
                    msg:"An Otp already has been send to your mail Or try after 1-mint",
                    color :'#dc3545'
                })  
                
            }
        }

        const g_otp=await generateRandom4Digit()  //g_otp => generate-otp
        
    
        const cDAte = new Date() //cDAte => current-Date

        const otpData = await Otp.findOneAndUpdate( //this is used for updating the otp  form the document which  has same email 
            {user_id : req.body.email},
            {otp     : g_otp , timestamp : new Date(cDAte.getTime())},
            {upsert  : true , new : true , setDefaultsOnInsert : true }
        )
        console.log(otpData);
    
        const Useremail = req.body.email; //can i move this to the line after 42 and use Useremail insted of req.body.email ?
        const subject = 'OTP VERIFICATION..!';
        const msgToUser = `<p>Use OTP:-<h3>${g_otp},</h3><br>To verifiying your Mail ,<br> DO-Not Share this code with anyone</p>`;

        nodeMailer.sendMaiL(Useremail, subject, msgToUser);
        console.log('email sent successfully');
        res.status(200).json({ 
            success:true,     
            msg:"An OTP has been sent to your email" 
            })
    
    } catch (error) {

        console.log('Failed to send  email', error.message);
        return res.status(500).redirect('/error')
    }
}
/*****************************************  VERIFY OTP    *********************************************/
   
   // SAME CODE OF '/verifyOtp' 

/***************************************    RESET PASSWORD       ************************************************/
const newPassword = async(req,res)=>{
    const email = req.body.email
    const password = req.body.password

    const spassword= await securePassword(password)

    const newPasswordData = await User.findOneAndUpdate(
        { email: email },
        { $set: { password: spassword } },
        { new: true } // This will return the updated document
    )
    console.log ('newPasswordData',newPasswordData);
    
    if(newPasswordData){
        res.status(200).json({
        success: true,
        message: " Password has been updated successfully "
        })
    }else{
        return res.status(500).json({
        success:false ,
        message : "!! Password Updation failed ,Plz try again !!"
        })
    }
}

/*******************************************    USER DASHBOARD     *************************************************** */
const userDashboard = async (req,res)=>{
    try {
        const userData = await User.findOne({_id : req.session.user_id})
        if(!userData){
            console.log('userData notfound (from :- userDashboard)');
            return res.status(500).render('errorCatch',{error : " !! Network Issue "})
        }
        res.render('userDashboard',{userData})
    } catch (error) {
        console.log(error.message);
        // return res.status(500).redirect('/error')
    }
}
/********************************************     EDIT PROFILE PAGE    ******************************************************************** */
const editProfilePage = async(req,res)=>{
    try {
        const userData = await User.findOne({_id : req.session.user_id})
        
        if(!userData){
            console.error('userData notfound (from :- updateProfile)');
            return res.status(500).render('errorCatch',{error : " !! plz Login again "})
        }
        res.render('editProfile',{user:userData})
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/********************************************      UPDATE PROFILE NAME     *************************************************************************/
const updateProfileName =async(req,res)=>{
    try {
        const user = await User.findOne({_id : req.session.user_id})

        if (user.length > 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if(user.firstName === req.body.fname && user.lastName === req.body.lname ){
            return res.status(400).json({
                   success:false,
                   message : 'Previous feild and Current Feild Cant be the same !!'
            })
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.session.user_id, 
            {
                firstName: req.body.fname, 
                lastName: req.body.lname
            },
            { new: true }  // returns the updated document
        );
            
        // console.log( "this ",updatedUser);

        if(!updatedUser){
            return res.status(404).json({
                success:false,
                message : 'Updating Failed , You have been Loged out '
            })
        }else{
            res.status(200).json({
                success: true,
                message: 'Profile name has been Updated'
            });
        }
        
        
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/*********************************************************************************************************************/
const updateMail_Mobile = async(req,res)=>{
    try {

        const user = await User.findOne({_id : req.session.user_id})

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const updateduseremail = req.body.email

        const existingEmail = await User.find({email:updateduseremail})   
        
        if (existingEmail.length > 0) {       
            return res.status(400).json({
            success:false,
            message:"Email already exists. Please use a different email."
            })  
        }

        const updatedusermobile = req.body.mobile
        const password = req.body.password
        
        const passwordMatch = await bcrypt.compare(password,user.password)
        if(passwordMatch){
            const updatedUser = await User.findByIdAndUpdate(
                user._id,
                {
                    email : updateduseremail,
                     mobile : updatedusermobile
                },
                    { new: true }
            )
            // console.log(updatedUser);
            
            if(updatedUser){
                res.status(200).json({
                    success:true,
                })
            }else{
                res.status(400).json({
                    success:false,
                    message : "Updation Failed"
                })
            }
        }else{
            res.status(401).json({
                success:false,
                message : " Password is  In-correct"
            })
        }

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/*****************************************************************************************************************/
const updatePasswordpage = async (req,res)=>{
    try {
        res.render('changePasswordPage')
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')   
    }
}
/*********************************************************************************************************************/
const updatePassword = async (req,res)=> {
    try {
        const user = await User.findOne({_id : req.session.user_id })
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        const password = req.body.cPassword
        const newPassword = req.body.nPassword

        console.log(newPassword);
        

        const passwordMatch = await bcrypt.compare(password,user.password)
        if(!passwordMatch){
            return res.status(401).json({
                success: false,
                message: "InCorrect Password"
            })
        }

        if(password===newPassword){
            return res.status(400).json({
                success: false,
                message: "Current Password & New Password canot be the same"
            })
        }
        
        const spassword = await securePassword(newPassword)

        const updatePassword = await User.findByIdAndUpdate(user._id,{password : spassword},{new : true})
        if(updatePassword){
                res.status(200).json({
                success: true,
                message: " Password has been updated successfully "
            })
        }else{
            return res.status(500).json({
                success:false ,
                message : "!! Password Updation failed ,Plz try again !!"
            })
        }
    } catch (error) {
         console.log(error.message);
         return res.status(500).redirect('/error')
    }
}

/******************************************************************************************************************** */
const addressPage = async(req, res) => {
    try {
        const userId = req.session.user_id; 

        
        const user = await User.findById(userId).populate('addresses'); // Finding the user by ID to get aray of addresses 

        if (!user) {
            return res.status(404).redirect('/login');
        }

        const addressData = user.addresses; //  to get the addresses i have used populate(on top) or else only adressess _id would be  given
        // console.log(addressData);
        
        res.render('userAddress', { address: addressData });
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
};

/************************************************************************************************************************* */
const addAddressPage = async (req,res)=>{
    try {
        res.render('addAddress')
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/*********************************************************************************************************************/
const addAddress = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).render('addAddress', {
                message: {
                    type: 'error',
                    text: 'You have been logged out. Please log in again.'
                }
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
            return res.status(500).render('addAddress', {
                message: {
                    type: 'error',
                    text: 'Adding Address failed, Try again..'
                }
            });
        }

        // Add the address to the specific user's address array
        user.addresses.push(addressData._id);
        await user.save();

        res.status(201).render('addAddress', {
            message: {
                type: 'success',
                text: 'Address added Successfully'
            }
        });

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
};
/*********************************************************************************************************************/
const editAddressPAge = async(req,res)=>{
    try {
        const specificAddress = await Address.findById(req.params.id)

        if(!specificAddress){
            console.log(" cannot found specificAddress (from UserAddressPAge  to editAddressPage )");
            return res.status(404).send('Address not found')
        }

        res.render('editAddress',{address : specificAddress })

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')  
    }
}
/********************************************************************************************************************* */
const updateAddress = async (req,res)=>{
    try {
        const address = await Address.findOne({_id : req.params.id})
        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Updation Failed Address Not Found"
            });
        }
        // console.log(address);
       
        const updateAddress = await Address.findByIdAndUpdate( req.params.id, {
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
/*********************************************************************************************************************/
const defaultAddress = async(req,res)=>{
    try {
        const addressId = req.params.id;
        const userId = req.session.user_id;

        const user = await User.findById(userId).populate('addresses')

        if(!user){
            return res.status(404).json({
                success: false,
                message: "user Not Found"
            });
        }

        const address = user.addresses.find(address => address._id.toString() === addressId )

        if(!address){
            return res.status(404).json({
                success : false , 
                message : "Address Not Found"
            })
        }

        await Address.updateMany({_id : { $in : user.addresses}},{ $set : {isDefault : false}})
        await Address.findByIdAndUpdate(addressId , {$set : {isDefault : true }})
        
        return res.status(204).end();      //204 -> No Content  ->means successful request, no data returned

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
}
/*********************************************************************************************************************/
const deleteAddress = async(req,res)=>{
    try {
        await Address.findByIdAndDelete(req.params.id)
        await User.findOneAndUpdate({addresses : req.params.id },{$pull:{addresses:req.params.id}})
        res.status(200).json({
            success : true,
            message : 'Deletion Succesfull'
        })
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
}
/********************************************************************************************************************* */
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
};

/******************************************************************************************************************* */
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
/*********************************************************************************************************************/
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
/*************************************** userWalletPage    ********************************************************************** */
const userWalletPage = async(req,res)=>{
    try {
        const wallet = await Wallet.findOne({user : req.session.user_id})
        res.render('userWallet',{wallet})
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/*************************************************     ADD MONEY TO WALLET     ********************************************************************* */
const addMoney = async(req,res)=>{
    try {

        const amount = req.body.amount 
        console.log(amount);

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

        console.log('razorpayOrder',razorpayOrder)

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
        console.log(error.message);
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

            console.log('razorpayPaymentId -', razorpayPaymentId)
            console.log('razorpayOrderId -', razorpayOrderId)
            console.log('razorpaySignature -', razorpaySignature)

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
        console.log(error.message);
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

        console.log(wallet);        

        const paymentError = req.body.error

        console.log('paymentError',paymentError,)

        const transaction  = wallet.transactions.find((transaction)=>{
            return transaction.razorpayOrderId ===  paymentError.metadata.order_id
        })

        console.log(transaction)

        transaction.status = 'failed',
        transaction.razorPaymentId = paymentError.metadata.payment_id
        
        await wallet.save()

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/********************************************************************************************************************************/
const userLogout = async(req,res)=>{
    try {
        req.session.destroy()
        res.redirect('/')  
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/********************************************************************************************************************* */
const errorpage = async(req,res)=>{
    res.render('errorCatch')
}
/********************************************************************************************************************* */

const page404 = async(req,res)=>{
    res.render('pageNotFound')
}
/********************************************************************************************************************* */


module.exports={

    loadSignup,
        sendMailOtp,
        verifyOtp,
        insertUser,

    loadLogin,
        verifyLogin,
        forgotPasswordPage,
            verifyPasswordOtp,
            newPassword,

    landingPage,
        Productspage,
        productDetails,

    productWishListPage,
        addRemoveWishList,
        wishListStatusUpdate,

    cartPage,
        addToCart,
        updateQuantity,
        removeproduct,
    
    confirmOrderPage, 
        addAddressFromCheckout,
        editAddressFromCheckout,
        confirmOrder,paymentFailed,
        verifyPayment,

    validateCoupon,

    userDashboard,
        editProfilePage,
            updateProfileName,updateMail_Mobile,
            updatePasswordpage,updatePassword,
    
        addressPage,
            addAddressPage,addAddress,
            editAddressPAge,updateAddress,
            deleteAddress,
            defaultAddress,
        
        orderHistory,
            orderCancellation,
            orderReturn,
        
        userWalletPage,
            addMoney,
            verifyWalletPayment,verifyWalletPaymentFailed,


    userLogout,


    errorpage,page404,

}