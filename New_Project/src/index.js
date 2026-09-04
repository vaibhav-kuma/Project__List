import dotenv from "dotenv"

import connectDB from "./db/index.js";
import {app} from "./app.js"

dotenv.config({
    path:'./env'
})









connectDB()
.then(()=>{
    app.on("error",(error)=>{
        console.error(error);
        throw error
       })
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`server is runnning at port :${process.env.PORT} `);
        
    })
})
.catch((err)=>{
    console.log("mongodb connection failed !!!",err);
    
})

/*
import express from "express";
const app = express();

(async()=>{
    try{
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       app.on("error",(error)=>{
        console.error(error);
        throw error
       })
       app.listen(process.env.PORT,()=>{
        console.log(`app is listeing on port ${process.env.PORt}`);
        
       })
    } catch(error){
        console.error(error)
        throw err
    }
})() */