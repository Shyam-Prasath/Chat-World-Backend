const jwt=require('jsonwebtoken')
const generate = ({id}) =>{
    const token = jwt.sign({id},process.env.JWT_TOKEN,{
        expiresIn:"30y"
    })
    return token
}
module.exports=generate