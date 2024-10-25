const multer = require('multer');

const storage = multer.diskStorage({
    destination:function (req,file,cb) {
        cb(null,'./public/imgs/product')
    },
    filename : (req,file,cb)=> {
        const name = Date.now()+'-Re-sized-'+file.originalname;
        cb(null,name)
    }
})
    const upload = multer({storage:storage})


module.exports = upload


