
const User = require('../../model/userModel');
const Product = require('../../model/productModel')
const Cart = require('../../model/cartModel')

const {calculateCartTotals} = require('../../helpers/utility')
/**************************************         CART PAGE      ***************************************************** */
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
/*********************************************          ADD TO CART            *************************** */
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
/******************************************          UPDATE QUANTITY           *********************************************************************/
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
/*******************************************          REMOVE PRODCUTS        ************************************ */
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
}


module.exports={
    cartPage,
        addToCart,
        updateQuantity,
        removeproduct,
}