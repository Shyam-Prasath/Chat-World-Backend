const user = require('../model/UserModel')
const bcrypt = require('bcrypt')
const generateToken = require('../webtoken/generateToken')
const chat = require('../model/ChatModel')
const message = require('../model/MessageModel')

const accessChat = async(req,res)=>{
    const {userId} = req.body
    if(!userId){
        res.status(400).send('UserId Not Found')
    }
    var isChat = await chat.find({
        isGroupChat: false,
        $and:[
            {users: {$elemMatch:{$eq: req.user._id}}},
            {users: {$elemMatch:{$eq: userId}}}
        ]
    })
    .populate('users','-password')
    .populate('latestMessage')
    isChat = await user.populate(isChat,{
        path:'latestMessage.sender',
        select:'name email'
    })
    if(isChat.length>0){
        res.send(isChat[0])
    }
    else{
        var chatData = {
            chatName:'sender',
            isGroupChat:false,
            users: [req.user._id,userId],
        }
        try{
            const createdChat = await chat.create(chatData)
            const fullChat= await chat.findOne({_id:createdChat._id}).populate("users","-password")
            res.status(200).json(fullChat)
        }
        catch(err){
            res.status(400);
            throw new Error(err.message)
        }
    }
}

const fetchChat = async(req,res) =>{
    try{
        await chat.find({users:{$elemMatch:{$eq: req.user._id  }}})
        .populate('users','-password')
        .populate('groupAdmin','-password')
        .populate('latestMesage')
        .sort()
        .then(async(result)=>{
            result = await user.populate(result,{
                path:'latestMessage.sender',
                select:'name email'
            })
            res.send(result)
        })
    }
    catch(err){
        res.status(400)
        throw new Error(err.message)
    }
}

const createGroup = async (req, res) => {
    if (!req.body.name || !req.body.users) {
        return res.status(400).send({ message: 'Data Absence' });
    }

    var users = JSON.parse(req.body.users);
    users.push(req.user);

    try {
        const chatGroup = await chat.create({
            chatName: req.body.name,
            isGroupChat: true,
            users: users,
            groupAdmin: req.user,
            creatorId: req.user._id // 🔹 NEW
        });

        const fullChatGroup = await chat.findOne({ _id: chatGroup._id })
            .populate('users', '-password')
            .populate('groupAdmin', '-password');

        res.status(200).json(fullChatGroup);
    } catch (err) {
        res.status(400);
        throw new Error(err.message);
    }
};


const fetchGroup = async (req, res) => {
    try {
        const myGroups = await chat.find({
            isGroupChat: true,
            creatorId: req.user._id // 🔹 filter by creator
        })
        .populate('users', '-password')
        .populate('groupAdmin', '-password');

        res.status(200).send(myGroups);
    } catch (err) {
        res.status(400);
        throw new Error(err.message);
    }
};


const deleteGroup = async(req,res) =>{
    const {chatId} = req.body
    try{
        const removeGroup = await chat.findByIdAndUpdate(chatId)
        .populate('users','password')
        .populate('groupAdmin','-password')

        if(!removed){
            res.status(400)
            throw new Error('Group Not Found')
        }
        else{
            res.json(removeGroup)
        }
    }
    catch(err){
        res.status(400)
        throw new Error(err.message)
    }
}

const addSelfUser = async(req,res) =>{
    const {chatId,userId}=req.body
    try {
        const chatUserAdded= await chat.findByIdAndUpdate(chatId,{
            $push: {users: userId},
        },
        {
            new: true,
        })
        .populate('users','-password')
        .populate('groupAdmin','-password')
        if(!chatUserAdded){
            res.status(400)
            throw new error('chat not found')
        }
        else{
            res.json(chatUserAdded)
        }
    }
    catch(err){
        console.log(err)
    }
}

module.exports={accessChat,fetchChat,createGroup,fetchGroup,deleteGroup,addSelfUser}