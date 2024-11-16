const Category = require("../../model/categoryModel")
const Product = require("../../model/productModel")

const path = require('path');
const fs = require('fs') 


/******************************     productDetails     *********************************************/
const productDetails = async(req,res)=>{ 
    try {
        searchTerm = req.query.search || null ;
        const searchConditon = searchTerm ? {productName : new RegExp(searchTerm,'i')} : {}

        const page = parseInt(req.query.page) || 1 // if query is null then that mens its the current page so 1 
        const limit = 5 ;  // number of products per page  is seted by limit
        const skip = (page - 1 )*limit 

        const totalProducts = await Product.countDocuments(searchConditon);   // Get total product count for pagination logic

        const products = await Product.find(searchConditon).populate('category').skip(skip).limit(limit)  //populate is used for Conecting with category model

        if(!products){
            return res.status(400).send('Categories is missing')
        }
        
        res.render('productInfo',{
            product : products ,
            searchTerm,
            currentPage: page,
            totalPages: Math.ceil(totalProducts / limit),  //if decimal number it will round to the next whole number
        })
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error') ; 
    }
}
/******************************      addProductPage     ******************************************/
const addProductPage = async(req,res)=>{
    try {
        const category = await Category.find() 
        if(category.length === 0){
            return res.redirect('/admin/category')
        } 
        
        res.render('addProduct',{category})
    } catch (error) {
        console.log(error.message);
        // return res.status(500).redirect('/error');
    }
}
/***********************************    addProduct     ******************************************/
const addProduct = async (req, res) => {
    try {
        const regularPrice = parseInt(req.body.PregularPrice);
        const salePrice = parseInt(req.body.PsalePrice);

        const Pdiscount = Math.round(((regularPrice - salePrice) / regularPrice) * 100);         // to get the percentage
                
         
        if (!req.files || req.files.length < 3 || req.files.length > 5) {
            // const category = await Category.find() 
            return res.render('addProduct', { message: "Ensure you upload at least 3 images but no more than 5..",category});
        }
        
        //Extract filenames from the uploaded files 
        let filenames = []
        for(let i = 0 ; i < req.files.length ; i++){
            filenames[i] = req.files[i].filename
        }

/*      y like this ->    req.files.map(file => file.filename)   (anotherway of loop) 
        y not      ->     req.file.filename 
        
        When using multer with upload.array('Pimages'),    [product images]
        The req.file become req.files why because   
        the req.files property is an array of objects.
        Each object in this array represents a single file
        and contains details about the file, including its filename,
        ie (req.files[0].filename)
*/ 
        console.log("Uploaded files: ", req.files);

        const product = new Product({
            productName: req.body.Pname,
            category: req.body.Pcategory,
            description: req.body.Pdescription,
            regularPrice: req.body.PregularPrice,
            discount : Pdiscount,
            salePrice : req.body.PsalePrice,
            unitsInStock: req.body.Punits,
            sizesAvailable: req.body.Psize,
            primaryColor: req.body.PprimaryColor,
            images: filenames,  // Save the array of filenames
        });

        const ProductAdded = await product.save();

        if (ProductAdded) {
            res.redirect('/admin/product');
        } else {
            res.render('addProduct', { message: "Process Failed, Please check with our team members" });
        }
    } catch (error) {
        console.log("Error in addProduct: ", error);
        const category = await Category.find() 
        res.status(500).render('addProduct', { message: "An error occurred while adding the product.",category });
    }
}

/**********************************    EDIT PRODUCT PAGE     *******************************************/
const editProductPage  =  async(req,res)=>{
    try {
        const productId =  req.query.id
           
        if(!productId){
            console.log("req.query.id not Found (editProductPage)");
            return res.status(404).redirect('*')
        }
        console.log(productId);

        const product = await Product.findOne({_id : productId}).populate('category')
        const category = await Category.find() 

        if(!product){
            console.log(error.message);
            return res.status(500).redirect('/error'); 
        }
        
        res.render('updateProduct',{product,category})
       
    } catch (error) {
        console.log(error.message);
        // return res.status(500).redirect('/error'); 
    }
}
/********************************* PRODUCT ISACTIVE / UNACTIVE *****************************************/
const productStatus = async(req,res)=>{
    try {
        const productId = req.body.productId
        const product = await Product.findById(productId)
            
        if(!product){
            return res.status(404).json({
                success : false ,
                message: " product not Found"
            })
        }

        await Product.updateOne({_id : productId },{$set :{forSale : !product.forSale}})

        res.status(200).json({
            success : true,
        })

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error') ;
    }
}
/*********************************      EDIT PRODUCT   ***************************************/
const editProduct = async (req,res)=>{
    try {
        const imagesToDelete = req.body.imagesToDelete
        console.log('hlo',imagesToDelete)

        const existingProduct =  await Product.findOne({_id:req.body.id}) // Storing the document to a variable before  getting updated[this is for removing the uploadfiles from system ]
        console.log(existingProduct);

        const regularPrice = parseInt(req.body.PregularPrice);
        const salePrice = parseInt(req.body.PsalePrice);
        
        const Pdiscount = Math.round(((regularPrice - salePrice) / regularPrice) * 100);// to get the percentage

        let finalImages = existingProduct.images || []
        console.log('finalImages',finalImages)

        if (imagesToDelete) {
            const imagesToDeleteArray = JSON.parse(imagesToDelete); // Parse the imagesToDelete array from the request
            console.log('parsed',imagesToDeleteArray)

            imagesToDeleteArray.forEach(image => {
                const imageIndex = finalImages.indexOf(image);
                if (imageIndex > -1) {
                    finalImages.splice(imageIndex, 1); // Remove the image from the array
                    // Delete the image file from the file system
                    const imagePath = path.join(__dirname, '../public/imgs/product/', image);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                        console.log(`Successfully deleted file: ${image}`);
                    }
                }
            });
        }


        if (req.files && req.files.length > 0) {

            const newFilenames = req.files.map(file => file.filename);
            finalImages = finalImages.concat(newFilenames); // Add new images to the final list

            console.log(finalImages.length)
            if (finalImages.length < 3 || finalImages.length > 5) {

               console.log(req.files)

                req.files.forEach((file) => {
                    const imagePath = path.join(__dirname, '../public/imgs/product/', file.filename);
                    fs.unlinkSync(imagePath);
                    console.log(`Successfully deleted file: ${file.filename}`);
                });

                return res.send( "Please ensure you have between 3 and 5 images")

                // const category = await Category.find()
                // return res.render('updateProduct', { message: "Please ensure you have between 3 and 5 images.", category,product:existingProduct });
            }
        }
    
        const updatedProduct = await Product.findByIdAndUpdate({_id:req.body.id},{$set:{   // here the old thing will get changed from db[even images]
            productName: req.body.Pname,
            category: req.body.Pcategory,
            description: req.body.Pdescription,
            regularPrice: req.body.PregularPrice,
            discount : Pdiscount,
            salePrice : req.body.PsalePrice,
            unitsInStock: req.body.Punits,
            sizesAvailable: req.body.Psize,
            primaryColor: req.body.PprimaryColor,
            images: finalImages, 
        }}, { new: true }  // this is given here cz if not given it will return the product details before updation 
    )

        // console.log("updated Product = > ",updatedProduct);
        
        if(!updatedProduct){
            res.render('addProduct', { message: "Process Failed, Please check with our team members" });
        }
        
            // //removing prvious img path from the folder
            // if(req.files.length>0){                                            //  console.log(req.files.length);
            //     existingProduct.images.forEach((image)=>{
            //         console.log(__dirname);
            //         const oldImagePath = path.join(__dirname, '../public/imgs/product/', image);
            //         console.log(oldImagePath);
            //         fs.unlinkSync(oldImagePath)
            //         console.log('successfully deleted file');
            //     })
            // }else{
            //     console.log('updatedProduct tym privious image is not getting deteted');
            //     console.log(error.message); 
            // }
        
        res.redirect('/admin/product')
        
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error'); 
    }
}
/*********************************      DELETE PRODUCT   ***************************************/

const deleteProduct = async (req, res) => {
    try {
        const id = req.body.id;
        
        const deletionProduct =  await Product.findOne({_id:id}) // Storing the document to a variable before  getting updated[this is for removing the uploadfiles from system ]

        await Product.deleteOne({_id:id})

        if(deletionProduct){
            deletionProduct.images.forEach((image)=>{
                console.log(__dirname);
                const oldImagePath = path.join(__dirname, '../public/imgs/product/', image);
                console.log(oldImagePath);
                fs.unlinkSync(oldImagePath)
                console.log('successfully deleted file');
            })
        }else{
            console.log('deletionProduct tym image is not getting deteted');
            console.log(error.message); 
        }

        res.redirect('/admin/product');

    } catch (error) {
        console.error('Error in deleteProduct:', error);
        res.status(500).redirect('/error');
    }
};

module.exports = {
    productDetails,
        addProductPage,
        addProduct,
        productStatus,
        editProductPage,editProduct,
        deleteProduct,
}