import { Schema } from "mongoose";

export const StoreCustomerSnapshotSchema = new Schema({
  name: String,
  lastName: String,
  mobile: String,
  sex: String,
  birthday: String,
  description: String,
}, { _id: false });
