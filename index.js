require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const fs = require("fs-extra");

const app = express();
const port = process.env.PORT || 5000;

//  middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "https://study-nook-client.vercel.app"],
    credentials: true,
  }),
);
app.options("*", cors());

app.use(express.json());
app.use(cookieParser());

// cloudinary configuration

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//multer configuration
const upload = multer({
  dest: "uploads/",
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.d2ts7wd.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verify token
function verifyToken(req, res, next) {
  const token = req.cookies.token;
  console.log(token);
  if (!token) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ error: true, message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB ✅",
    );
    const db = client.db("study-nook");
    const roomCollection = db.collection("rooms");
    const orderCollection = db.collection("orders");

    //   JWT
    app.post("/jwt", (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "24h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    // app.post("/add-room", async (req, res) => {
    //   const user = req.body;
    //   console.log(user);
    //   const result = await roomCollection.insertOne(user);
    //   res.send(result);
    // });

    app.post("/add-room", upload.single("image"), async (req, res) => {
      try {
        const image = await cloudinary.uploader.upload(req.file.path, {
          folder: "study-nook",
        });
        await fs.remove(req.file.path);
        req.body.image = image.secure_url;
        req.body.organizer = JSON.parse(req.body.organizer);
        req.body.amenities = JSON.parse(req.body.amenities);
        const rooms = req.body;
        // console.log("rooms",rooms)
        const result = await roomCollection.insertOne(rooms);
        res.send(result);
      } catch (error) {
        console.error("Error occurred while adding room:", error);
        res.status(500).send({ error: true, message: "Internal server error" });
      }
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

    app.get("/my-listings/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = { "organizer.email": email };
      const result = await roomCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/api/rooms/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await roomCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/api/rooms/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const upDatedRoom = req.body;
      const upDateDoc = {
        $set: {
          room_name: upDatedRoom.room_name,
          floor: upDatedRoom.floor,
          capacity: upDatedRoom.capacity,
          hourly_rate: upDatedRoom.hourly_rate,
        },
      };
      const options = { upsert: true };
      const result = await roomCollection.updateOne(filter, upDateDoc, options);
      res.send(result);
    });

    app.post("/order", async (req, res) => {
      const order = req.body;
      // console.log(order);
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    app.get("/my-bookings/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = { "buyer.email": email };
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/api/bookings/:id/cancel", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updatedBooking = req.body;
      const updateDoc = {
        $set: {
          status: "cancelled",
        },
      };
      const options = { upsert: true };
      const result = await orderCollection.updateOne(
        filter,
        updateDoc,
        options,
      );
      res.send(result);
    });
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
