// import "dotenv/config";

// import mongoose from "mongoose";
// import GameList from "./model/GameList.ts";
// import dbConnect from "./lib/mongodb.ts";

// async function addItemIds() {
//   await dbConnect();

//   try {
//     console.log("MongoDB Connected");

//     const gameList = await GameList.findOne({
//       platform: "ps5Copy",
//     }).lean();

//     if (!gameList) {
//       console.log("Game list not found");
//       return;
//     }

//     const updatedItems = gameList.items.map((item: any) => ({
//       ...item,

//       _id: item._id ?? new mongoose.Types.ObjectId(),
//     }));

//     await GameList.updateOne(
//       {
//         _id: gameList._id,
//       },
//       {
//         $set: {
//           items: updatedItems,
//         },
//       },
//     );

//     console.log("IDs added successfully");
//   } catch (error) {
//     console.log(error);
//   } finally {
//     await mongoose.disconnect();
//   }
// }

// addItemIds();
