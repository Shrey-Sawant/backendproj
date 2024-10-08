import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB=async ()=>{
    try {
       const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       console.log(`\nMongoDB Connected!!! DB Host:${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("Error: MONGODB CONNECTION ERROR:",error);
        process.exit(1);
    }
}

export default connectDB;
//-r dotenv/config --expreimental-json-modules 