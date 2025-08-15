const express=require('express')
const {loginController,registerController, fetchAllUsers,updateWallet}=require('../controller/userController')
const {protect} = require('../middleware/authmiddleware')
const Router=express.Router()


Router.post('/login',loginController)
Router.post('/register',registerController)
Router.get('/fetchUser',protect,fetchAllUsers)

Router.post('/updateWallet', protect, updateWallet);

module.exports=Router;