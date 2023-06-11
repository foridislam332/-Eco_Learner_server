const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }

        req.decoded = decoded;
        next();
    })
}

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
        // await client.connect();


        const classesCollection = client.db('eco_learner').collection('classes');
        const selectedClassCollection = client.db('eco_learner').collection('selected_classes');
        const usersCollection = client.db('eco_learner').collection('users');

        // jwt
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

            res.send({ token })
        })

        // verify Admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }

        // verify Instructor
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }

        // get admin
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })

        // get instructor
        app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            console.log(result)
            res.send(result);
        })

        // get current user
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await usersCollection.findOne(query);
            res.send(result);
        })

        // get users
        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        })

        // post user
        app.post('/users', async (req, res) => {
            const user = req.body;
            const email = user.email;
            const query = { email: email };
            const isExist = await usersCollection.findOne(query);
            if (isExist) {
                return res.send({ message: 'user already exists' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        // update user role
        app.patch('/users/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const updatedRole = req.query.role;
            const updateDoc = {
                $set: {
                    role: updatedRole,
                }
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result)
        });

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
        app.get('/myClasses', verifyJWT, verifyInstructor, async (req, res) => {
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

        // send feedback
        app.patch('/manageFeedback/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const feedback = req.query.feedback;
            console.log(feedback)
            const updateDoc = {
                $set: {
                    feedback: feedback,
                }
            };
            const result = await classesCollection.updateOne(filter, updateDoc);
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

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

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