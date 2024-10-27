
const Wishlist = require("../model/wishListModel")

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
}

module.exports={
    productWishListPage,
        addRemoveWishList,
        wishListStatusUpdate,
}
