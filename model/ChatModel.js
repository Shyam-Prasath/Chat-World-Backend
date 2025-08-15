const mongoose=require('mongoose')

const ChatModel=mongoose.Schema({
    chatName:{
        type: String,
    },
    isGroupChat:{
        type:Boolean,
    },
    users:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"user",
        }
    ],
    latestMesage:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Message',
    },
    groupAdmin:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user'
    },
    creatorId: { // 🔹 NEW FIELD
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
    }
},
{
    timeStrap: true
}
)

const chat=mongoose.model("Chat",ChatModel)
module.exports=chat