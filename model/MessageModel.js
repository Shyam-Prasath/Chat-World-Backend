const mongoose = require('mongoose');

const MessageSchema = mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat'
    },
    content: { // missing in your schema, should store the actual message text
        type: String,
        required: true
    },
    file: { 
        url: { type: String },  
        type: { type: String }  
    }
}, {
    timestamps: true // ✅ fixed typo here
});

const Message = mongoose.model("Message", MessageSchema);
module.exports = Message;
