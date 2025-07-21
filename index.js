const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 3000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

//Middleware
app.use(cors({ origin: ['http://localhost:5173'] }))
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dysq3yj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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


        const userCollections = client.db('car_zone_db').collection('users')
        const carCollections = client.db('car_zone_db').collection('cars')
        const bookingCollections = client.db('car_zone_db').collection('bookings')

        // -------  auth apis---------
        // login
        app.post('/login', async (req, res) => {
            const payload = req.body
            if (!payload.email) {
                return res.send({ success: false, message: 'Email is required' })
            }

            const existUser = await userCollections.findOne(payload)
            if (!existUser) {
                await userCollections.insertOne(payload)
            }

            // generate jwt token 
            const token = jwt.sign({
                email: payload.email
            }, 'secret', { expiresIn: '30d' });
            res.send({ success: true, accessToken: token })
        })


        //get Booking API
        app.get('/bookings', async (req, res) => {
            const token = req.headers.authorization  // recieve the token from frontend
            if (!token) {
                return res.send({ success: false, message: 'You are not authorized' })
            }
            // verity the token
            const decodedUser = jwt.verify(token, 'secret');

            const result = await bookingCollections.find({ user: decodedUser?.email }).toArray()
            res.send(result)
        })

        //post bookings API
        app.post('/bookings', async (req, res) => {
            const token = req.headers.authorization  // recieve the token from frontend
            if (!token) {
                return res.send({ success: false, message: 'You are not authorized' })
            }
            // verity the token
            const decodedUser = jwt.verify(token, 'secret');

            const payload = req.body
            payload.user = decodedUser?.email
            payload.status = 'pending'
            const result = await bookingCollections.insertOne(payload);

            // increment car booking count
            if (result) {
                await carCollections.findOneAndUpdate({ _id: new ObjectId(payload.car._id) }, { $inc: { bookingCount: 1 } },
                    { returnDocument: 'after' })
            }
            res.send(result);
        })

        //update booking 
        app.patch("/bookings/:id", async (req, res) => {
            const token = req.headers.authorization  // recieve the token from frontend
            if (!token) {
                return res.send({ success: false, message: 'You are not authorized' })
            }
            // verity the token
            const decodedUser = jwt.verify(token, 'secret');

            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedBooking = req.body;
            const updatedDoc = {
                $set: updatedBooking
            }
            const result = await bookingCollections.updateOne(filter, updatedDoc)
            console.log(result);
            res.send(result)
        })




        //get cars API
        app.get('/cars', async (req, res) => {
            const sortQuery = req.query.sort
            console.log(sortQuery);
            const cursor = carCollections.find().sort({ date: sortQuery === 'desc' ? -1 : 1 })
            const result = await cursor.toArray()
            res.send(result)
        })

        //get my cars API
        app.get('/my-cars', async (req, res) => {
            const token = req.headers.authorization  // recieve the token from frontend
            if (!token) {
                return res.send({ success: false, message: 'You are not authorized' })
            }
            // verity the token
            const decodedUser = jwt.verify(token, 'secret');

            const sortQuery = req.query.sort
            const cursor = carCollections.find({ user: decodedUser?.email }).sort({ date: sortQuery === 'desc' ? -1 : 1 })
            const result = await cursor.toArray()
            res.send(result)
        })

        //add car API
        app.post('/cars', async (req, res) => {
            const token = req.headers.authorization  // recieve the token from frontend
            if (!token) {
                return res.send({ success: false, message: 'You are not authorized' })
            }
            // verity the token
            const decodedUser = jwt.verify(token, 'secret');

            const car = req.body
            car.user = decodedUser?.email
            car.bookingCount = 0
            car.date = new Date()
            const result = await carCollections.insertOne(car);
            res.send(result);
        })

        // specific id
        app.get('/cars/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await carCollections.findOne(query)
            res.send(result)
        })

        //update car 
        app.put("/cars/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const option = { upsert: true };
            const updatedCar = req.body;
            const updatedDoc = {
                $set: updatedCar
            }
            const result = await carCollections.updateOne(filter, updatedDoc, option)
            res.send(result)
        })

        //Delete car 
        app.delete("/cars/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await carCollections.deleteOne(query)
            res.send(result);
        })


        // GET /cars/recent
        app.get('/cars', async (req, res) => {
            try {
                const cars = await carCollections.find().sort({ createdAt: -1 }).toArray(); // ⬅ Sort newest first
                res.send(cars);
            } catch (error) {
                res.status(500).send({ message: 'Error fetching cars', error });
            }
        });

        // get profile
        app.get('/profile', async (req, res) => {
            const token = req.headers.authorization  // recieve the token from frontend
            if (!token) {
                return res.send({ success: false, message: 'You are not authorized' })
            }
            // verity the token
            const decodedUser = jwt.verify(token, 'secret');

            const result = await carCollections.findOne({email: decodedUser.email})
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
    res.send('Car Zone server running')
})

app.listen(port, () => {
    console.log(`Car zone server is running on port ${port}`)
})