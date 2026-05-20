require("dotenv").config();
const express = require("express");
const cors = require("cors");


const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.d2ts7wd.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB ✅",
    );
    const db = client.db("study-nook");
    const roomCollection = db.collection("rooms");

    app.post("/add-room", async (req, res) => {
      const user = req.body;
      console.log(user);
      const result = await roomCollection.insertOne(user);
      res.send(result);
    });

    app.get("/rooms", async (req, res) => {
      const result = await roomCollection.find().toArray();
      res.send(result);
    });

    app.get("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await roomCollection.findOne(query);
      res.send(result);
    });

    app.delete("/api/rooms/:id", async (req, res)=>{
        const id = req.params.id;
        console.log(id);
        const query = {_id: new ObjectId(id)};
        const result = await roomCollection.deleteOne(query);
        res.send(result);
    })

    app.put("/api/rooms/:id", async (req,res)=>{
        const id = req.params.id;
        console.log(id);
        const filter = {_id: new ObjectId(id)};
        const upDatedRoom = req.body;
        const upDateDoc = {
            $set:{
                room_name: upDatedRoom.room_name,
                floor: upDatedRoom.floor,
                capacity: upDatedRoom.capacity,
                hourly_rate: upDatedRoom.hourly_rate,
            }
        }
        const options = {upsert: true};
        const result =await roomCollection.updateOne(filter,upDateDoc,options);
        res.send(result);
    })
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("study nook server is running successfully 📚");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
