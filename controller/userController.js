const user = require('../model/UserModel')
const bcrypt = require('bcrypt')
const generateToken = require('../webtoken/generateToken')
const chat = require('../model/ChatModel')
const message = require('../model/MessageModel')

const isValidEthAddress = (addr) =>
  typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr);

const loginController = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await user.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ error: 'User Not Found' });
    }

    const validPassword = await bcrypt.compare(password, existingUser.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    return res.status(200).json({
      message: 'User logged in successfully',
      user: {
        _id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        walletAddress: existingUser.walletAddress || null,
      },
      requiresWallet: !existingUser.walletAddress, // <-- tells FE to collect wallet if missing
      token: generateToken({ id: existingUser._id }),
    });
  } catch (err) {
    console.error('loginController error:', err);
    return res.status(500).json({ error: err.message });
  }
};


// controller/userController.js
const registerController = async (req, res) => {
  const { name, email, password, walletAddress } = req.body;

  try {
    if (!name || !email || !password || !walletAddress) {
      return res
        .status(400)
        .json({ error: 'All fields (name, email, password, walletAddress) are required' });
    }

    if (!isValidEthAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum wallet address' });
    }

    // Check duplicates
    const [emailExists, nameExists, walletExists] = await Promise.all([
      user.findOne({ email }),
      user.findOne({ name }),
      user.findOne({ walletAddress }),
    ]);

    if (emailExists) return res.status(409).json({ error: 'Email already exists' });
    if (nameExists) return res.status(409).json({ error: 'Username already exists' });
    if (walletExists) return res.status(409).json({ error: 'Wallet address already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await user.create({
      name,
      email,
      password: hashedPassword,
      walletAddress,
    });

    return res.status(201).json({
      message: 'User Registered Successfully',
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        walletAddress: newUser.walletAddress,
      },
      token: generateToken({ id: newUser._id }),
    });
  } catch (err) {
    console.error('registerController error:', err);
    return res.status(500).json({ error: err.message });
  }
};


const fetchAllUsers = async (req,res) =>{
    try{
        const keyword=req.query.search
        ?{
            $or:[
                {name:{$regex: req.query.search,$options: "i"}},
                {email:{$regex: req.query.search,$options: "i"}}
            ]
        }:{}
        const users= await user.find(keyword).find({
            _id: {$ne:req.user._id},
        })
        res.status(200).json(users)
    }
    catch(err){
        res.status(500).json({error:err.message})
    }
}

const updateWallet = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { walletAddress } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }
    if (!isValidEthAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum wallet address' });
    }

    // Ensure unique wallet
    const exists = await user.findOne({ walletAddress });
    if (exists) {
      // If the same user already has the same wallet, allow idempotency
      if (exists._id.toString() !== userId.toString()) {
        return res.status(409).json({ error: 'Wallet address already exists' });
      }
    }

    const updated = await user.findByIdAndUpdate(
      userId,
      { walletAddress },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      message: 'Wallet address updated successfully',
      user: {
        _id: updated._id,
        name: updated.name,
        email: updated.email,
        walletAddress: updated.walletAddress,
      },
    });
  } catch (err) {
    console.error('updateWallet error:', err);
    return res.status(500).json({ error: err.message });
  }
};

module.exports={loginController,registerController,fetchAllUsers,updateWallet}