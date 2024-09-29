import multer from 'multer';


var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log('file data', file);
        cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname)
    }
})

export const upload = multer({ storage: storage })
