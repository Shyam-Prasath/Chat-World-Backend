const mongoose=require('mongoose')

const userModel=mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
    },
    password:{
        type:String,
        required:true,
    },
    walletAddress: {
        type: String,
        unique: true,
        sparse: true,
        default: null
    }
},{ timestamps: true })

const user=mongoose.model('user',userModel)
module.exports=user