const User = require('../../model/userModel');
const Product = require('../../model/productModel')
const Category = require("../../model/categoryModel")

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
}
/********************************************************************************************************************************* */
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
}
/*********************************************       PRODUCT DETAILS     ************************************************************************************/
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

module.exports = {
    landingPage,
        Productspage,
        productDetails,
}
