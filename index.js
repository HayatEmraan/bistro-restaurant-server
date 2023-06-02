const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1ki0ifk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verifyJWT
const verifyJWT = (req, res, next) => {
  const query = req.headers.authorization;
  if (!query) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  jwt.verify(query, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const verifyAdmin = async (req, res, next) => {
      const query = req.decoded.email;
      const find = await bistroUsers.findOne({ email: query });
      if (find?.admin !== true) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    // create database and collection
    const bistroMenu = client.db("bistroDB").collection("bistroMenu");
    const bistroReviews = client.db("bistroDB").collection("bistroReviews");
    const bistroOrders = client.db("bistroDB").collection("bistroOrders");
    const bistroUsers = client.db("bistroDB").collection("bistroUsers");

    // find all documents in the collection
    app.get("/menu", async (req, res) => {
      const query = req.query;
      const skip = parseInt(query.skip) || 0;
      const limit = parseInt(query.limit) || 10;
      const skiplimit = skip * limit;
      const cursor = query.limit
        ? await bistroMenu.find({}).skip(skiplimit).limit(limit)
        : await bistroMenu.find({});
      const results = await cursor.toArray();
      res.send(results);
    });

    app.get("/reviews", async (req, res) => {
      const cursor = await bistroReviews.find({});
      const results = await cursor.toArray();
      res.send(results);
    });
    // total number of documents in the collection
    app.get("/menu/total", async (req, res) => {
      const cursor = await bistroMenu.estimatedDocumentCount();
      res.send({ cursor });
    });
    app.post("/addorder", async (req, res) => {
      const order = req.body;
      const result = await bistroOrders.insertOne(order);
      res.send(result);
    });
    // admin cookies add
    app.post("/api/admin/cookies", async (req, res) => {
      const query = req.body;
      console.log(query);
      const token = jwt.sign(query, process.env.ACCESS_TOKEN, {
        expiresIn: "24h",
      });
      res.send({ token });
    });
    app.get("/orders", verifyJWT, async (req, res) => {
      const query = req.query;
      const cursor = await bistroOrders.find({ email: query.email });
      const results = await cursor.toArray();
      res.send(results);
    });
    app.delete("/orders/:id", async (req, res) => {
      const query = req.params.id;
      const result = await bistroOrders.deleteOne({ _id: new ObjectId(query) });
      res.send(result);
    });

    // client users
    app.get("/api/admin/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await bistroUsers.find({}).toArray();
      res.send(result);
    });
    app.post("/api/admin/users/post", async (req, res) => {
      const find = { email: req.body.email };
      const filter = await bistroUsers.findOne(find);
      if (filter) {
        return res.send({ message: "User already exists" });
      }
      const result = await bistroUsers.insertOne(req.body);
      res.send(result);
    });
    app.patch("/api/admin/users/patch/:id", async (req, res) => {
      const query = req.params.id;
      const filter = await bistroUsers.findOne({ _id: new ObjectId(query) });
      if (filter.admin === true) {
        const result = await bistroUsers.updateOne(
          { _id: new ObjectId(query) },
          { $set: { admin: false } }
        );
        return res.send(result);
      }
      const result = await bistroUsers.updateOne(
        { _id: new ObjectId(query) },
        { $set: { admin: true } }
      );
      res.send(result);
    });

    app.get("/api/users/admin/:email", verifyJWT, async (req, res) => {
      const query = req.params.email;
      if (req.decoded.email !== query) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await bistroUsers.findOne({ email: query, admin: true });
      res.send(result);
    });




    app.delete("/api/admin/users/delete/:id", async (req, res) => {
      const query = req.params.id;
      const result = await bistroUsers.deleteOne({ _id: new ObjectId(query) });
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }

  // module export
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port);
