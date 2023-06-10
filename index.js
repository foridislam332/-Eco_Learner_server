const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1huygit.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const classesCollection = client.db('eco_learner').collection('classes');
        const selectedClassCollection = client.db('eco_learner').collection('selected_classes');
        const usersClassCollection = client.db('eco_learner').collection('users');

        // get users
        app.get('/users', async (req, res) => {
            const result = await usersClassCollection.find().toArray();
            res.send(result)
        })

        // post user
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersClassCollection.insertOne(user);
            res.send(result)
        })

        // get all classes
        app.get('/classes', async (req, res) => {
            const cursor = classesCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })

        // get single class
        app.get('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await classesCollection.findOne(query);
            res.send(result)
        })

        // get my classes
        app.get('/myClasses', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const cursor = classesCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        // post classes
        app.post('/classes', async (req, res) => {
            const item = req.body;
            const result = await classesCollection.insertOne(item);
            res.send(result)
        })

        // update my class
        app.patch('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedClass = req.body;
            const updateDoc = {
                $set: {
                    name: updatedClass.name,
                    instructor: updatedClass.instructor,
                    instructorImage: updatedClass.instructorImage,
                    image: updatedClass.image,
                    des: updatedClass.des,
                    price: updatedClass.price,
                    seats: updatedClass.seats
                },
            };
            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result)
        });

        // update class status
        app.patch('/manageClasses/:id', async (req, res) => {
            const id = req.params.id;
            const option = { upsert: true };
            const filter = { _id: new ObjectId(id) }
            const updatedStatus = req.query.status;
            const updateDoc = {
                $set: {
                    status: updatedStatus,
                }
            };
            const result = await classesCollection.updateOne(filter, updateDoc, option);
            res.send(result)
        });

        // get instructor classes
        app.get('/instructors/:instructor', async (req, res) => {
            const instructor = req.params.instructor;
            const query = { instructor: instructor }
            const cursor = classesCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        // get selected classes
        app.get('/selectedClasses', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await selectedClassCollection.find(query).toArray();
            res.send(result)
        })

        // post selected classes
        app.post('/selectedClasses', async (req, res) => {
            const item = req.body;
            const result = await selectedClassCollection.insertOne(item);
            res.send(result)
        })

        // delete selected class
        app.delete('/selectedClasses/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await selectedClassCollection.deleteOne(query);
            res.send(result)
        })

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Eco Learner is running')
})

app.listen(port, () => {
    console.log(`Eco Learner is running on port ${port}`)
})