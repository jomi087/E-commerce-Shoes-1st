const Category = require("../../model/categoryModel")

/*********************************      CATEGORY DETAILS    ***************************************/
const categoryDetails  = async (req,res)=>{
    try {
        const categoryData = await Category .find()   //all info login  users
        // console.log(categoryData);
        
        res.render('productCategory',{category : categoryData})
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
}
/*************************************   ADD CATEGORY    *****************************************/
const addCategory = async (req,res)=>{
    try { 
        const ExistingCategory  = await Category.findOne({name : req.body.categoryName})

        if(ExistingCategory){
            const categoryData = await Category .find()
            return res.render('productCategory',{alert:"This Category already exist",category : categoryData})    //slight bug  ower here   
        }

        const category = new Category({
            name :req.body.categoryName,
            description : req.body.productdescription, 
        })
        
       const newCategory = await category.save();
       console.log(`newCategory = ${newCategory}`);

       if(newCategory){
            res.redirect('/admin/category')
       }else{
            res.render('productCategory',{message:"Process Failed,Please check with our team-members"})
       }
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error'); 
    }
}
/***********************************   PRODUCT ISACTIVE / UNACTIVE   ***************************************************/
const categoryStatus = async(req,res)=>{
    try {
        const categoryId = req.body.categoryId
        const category = await Category.findById(categoryId)

        if(!category){
            return res.status(404).json({
                success : false ,
                message: " category not Found"
            })
        }

        await Category.updateOne({_id : categoryId },{$set : {isActive : !category.isActive }})

        res.status(200).json({
            success : true,
        })

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error'); 
    }
}
/***********************************       EDIT CATEGORY PAGE      *******************************************/
const editCategoryPage = async(req,res)=>{
    try {
        const categoryId= req.query.id

        if(!categoryId){
            console.log("req.query.id not Found (editCategoryPage)");
            return res.status(404).redirect('*');
        }
        console.log(categoryId);
        
        const category = await Category.findOne({_id : categoryId})
        console.log(category);
        
        res.render("updateCategory",{category : category})

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error'); 
    }
}
/*********************************    EDIT CATEGORY    ********************************************/
const editCategory = async(req,res)=>{
    try {

        // Find a category with the same name, but not the same ID
        const existingaCategoryName = await Category.findOne({name: req.body.categoryName, _id:{ $ne: req.body.id } });

        if(existingaCategoryName){
            const category = await Category.findById(req.body.id);
            res.render('updateCategory',{alert:"This Category- Name already exist Give some other Name ",category}) 
        }
        
        const updatedCategory = await Category.findByIdAndUpdate({_id:req.body.id},{ $set:{name : req.body.categoryName , description : req.body.productDescription }})  

        if(updatedCategory){
            res.redirect('/admin/category')
        }else{
            console.log('Category not found');
        return res.status(404).redirect('/error');
        }
        
      } catch (error) {
        console.log(error.message);
        // return res.status(500).redirect('/error')
      }
}
/*****************************************************************************/
const categoryOffer =  async(req,res)=>{
    try {
        const category = await Category.findById(req.params.id)
        res.render('offerDetails',{category})
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/*****************************************************************************/
const addOffer = async(req,res)=>{
    try {
        
        // const categoryId = req.body.categoryId
        // const offerName = req.body.offerName
        // const discount = req.body.discount
        // const startDate = req.body.startDate
        // const endDate = req.body.endDate
        // const description = req.body.description 
        // Rather writting like this we can use destucturing method to reduce the line of code

        const { categoryId, offerName, discount, startDate, endDate, description } = req.body;

        const category = await Category.findById(categoryId)

        if(!category){
            console.log('category not found')
        }

        const currentDate = new Date();
        const currentDateOnly = new Date(currentDate.setHours(0, 0, 0, 0)); // Remove time from current date
        const startDateOnly = new Date(new Date(startDate).setHours(0, 0, 0, 0)); // Remove time from start date
        const endDateOnly = new Date(new Date(endDate).setHours(23, 59, 59, 999)); // Set end date to the end of the day

        const isOfferActive  = currentDateOnly >= startDateOnly && currentDateOnly <= endDateOnly  // will give a boolean value

        const newOffer = {
            name : offerName,
            discount ,
            startDate ,
            endDate,
            description,
            status : isOfferActive
        }

        category.offer = newOffer

        await category.save()

        res.status(200).json({
            success : true,
        })

    } catch (error) {
        console.log(error.message)
        return res.status(500).redirect('/error');
    }
}
/*****************************************************************************/
const editOffer =  async(req,res)=>{
    try {
        
        const {categoryId, offerName, discount, startDate, endDate, description} = req.body

        const currentDate = new Date();
        const currentDateOnly = new Date(currentDate.setHours(0, 0, 0, 0)); // Remove time from current date
        const startDateOnly = new Date(new Date(startDate).setHours(0, 0, 0, 0)); // Remove time from start date
        const endDateOnly = new Date(new Date(endDate).setHours(23, 59, 59, 999)); // Set end date to the end of the day

        const isOfferActive  = currentDateOnly >= startDateOnly && currentDateOnly <= endDateOnly 
        
        const updateOffer = await Category.findByIdAndUpdate(categoryId, {
            $set: {
                'offer.name': offerName,
                'offer.discount': discount,
                'offer.startDate': startDate, 
                'offer.endDate': endDate,
                'offer.description': description,
                'offer.status': isOfferActive
            }
        }, { new: true });

        // console.log( startDate , new Date(startDate) , new Date() )

        if(!updateOffer){
            console.log(' updateoffer failed , category not found')
            return res.status(404).json({
                success : false
            })        
        }

        res.status(200).json({
            success : true
        })

    } catch (error) {
        console.log(error.message)
        return res.status(500).redirect('/error');
    }
}
/*****************************************************************************/
const deleteOffer = async(req,res)=>{
    try {
        const categoryId = req.body.categoryId

        const category = await Category.findById(categoryId)

        if (!category || !category.offer) {
            return res.status(404).json({ success: false, message: 'Category or offer not found.' });
        }

        const History = {
            name : category.offer.name,
            discount : category.offer.discount ,
            startDate  : category.offer.startDate ,
            endDate : category.offer.endDate,
            description : category.offer.description,
        }
        
        category.offerHistory.push(History)
        await category.save()

        await Category.updateOne({ _id : categoryId},{$unset :{offer: 1 }})

        res.status(200).json({
            success : true,
        })

    } catch (error) {
        console.log(error.message)
        return res.status(500).redirect('/error');
    }
}

module.exports={
    categoryDetails,
        addCategory,
        categoryStatus,
        editCategoryPage, editCategory,

    categoryOffer,
        addOffer,
        editOffer,
        deleteOffer
}