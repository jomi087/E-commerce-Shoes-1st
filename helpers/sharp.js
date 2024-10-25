const sharp = require('sharp')
const fs  = require('fs').promises

//currently i am only using multimageCrop  but for future use , i have written  singleimageCrop

const multimageCrop = async (req,res,next)=>{
    const imagePaths = req.files.map(file => file.path) || []
    if(imagePaths.length == 0){
        return next()
    }
  
     try{   for(imgpath of imagePaths){
            const imageBuffer =await fs.readFile(imgpath);
        const processedImage = await sharp(imageBuffer)
        .resize(400,500)
        .toFormat('webp')
        .toBuffer()
       
       await fs.writeFile(imgpath,processedImage);
        console.log('image resized successfully');
        next()
        }}
        catch(err){
            console.log(err.message);   
        }

}
const singleimageCrop = async (req,res,next)=>{
    const imagePath = req.file?req.file.path:null
    if(imagePath == null){
        return next()
    }

    try {
        const imageBuffer = await fs.readFile(imagePath);
        const processedImage = await sharp(imageBuffer)
        .resize(400,500)
        .toFormat('webp')
        .toBuffer()
        await fs.writeFile(imagePath,processedImage)
        console.log("image resized successfully");
        next()
        
    } catch (error) {
        console.log(error.message);
        
    }
}

module.exports = {
    multimageCrop,
    singleimageCrop
};