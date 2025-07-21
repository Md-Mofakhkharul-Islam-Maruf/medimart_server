const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { generateAccessToken, sendResponse, verifyToken } = require('./utils');
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
        const db = client.db('mediMart');
        const users = db.collection('users');
        const products = db.collection('products');
        const categories = db.collection('categories');
        const companies = db.collection('companies');
        const orders = db.collection('orders');
        const payments = db.collection('payments');
        const banners = db.collection('banners');

        // -------  auth apis---------
        // login
        app.post('/login', async (req, res) => {
            const payload = req.body
            if (!payload.email && !payload.role) {
                return res.send({ success: false, message: 'Email and role is required' })
            }

            let existUser = await users.findOne({ email: payload.email })
            if (!existUser) {
                await users.insertOne(payload)
                existUser = await users.findOne({ email: payload.email })
            }

            // generate jwt token 
            const token = generateAccessToken({ _id: existUser._id, email: existUser?.email, role: existUser?.role })

            sendResponse(res, {
                success: true,
                message: 'Login successful',
                data: { accessToken: token }
            })
        })

        // get profile
        app.get('/profile', verifyToken, async (req, res) => {
            const result = await users.findOne({ email: req.user.email })

            sendResponse(res, {
                success: true,
                message: 'Retrieved profile successful',
                data: result
            })
        })

        // update user
        app.patch('/users/:id', verifyToken, async (req, res) => {
            const result = await users.findOneAndUpdate({ _id: new ObjectId(req.params.id) }, { $set: req.body }, { returnDocument: 'after' })

            sendResponse(res, {
                success: true,
                message: 'User retrieved successful',
                data: result
            })
        })

        // create category
        app.post('/categories', verifyToken, async (req, res) => {
            // check if the category already exist
            const isExist = await categories.findOne({ name: req.body.name })
            if (isExist) {
                return sendResponse(res, {
                    success: false,
                    statusCode: 403,
                    message: "Already exists"
                })
            }

            const result = await categories.insertOne(req.body, { returnDocument: 'after' })

            sendResponse(res, {
                success: true,
                message: 'Created category successful',
                data: result
            })
        })

        // delete category
        app.delete('/categories/:id', verifyToken, async (req, res) => {
            const isExist = await categories.findOne({_id: new ObjectId(req.params.id)})
            if(!isExist){
                return sendResponse(res, {
                    success: false,
                    statusCode: 404,
                    message: 'Category not exist'
                })
            }

            const result = await categories.deleteOne({_id: isExist._id}, {returnDocument: 'after'})

            sendResponse(res, {
                success: true,
                message: 'Deleted successful',
                data: result
            })
        })

        // delete category
        app.get('/categories', async (req, res) => {
            const result = await categories.find({}).toArray()

            sendResponse(res, {
                success: true,
                message: 'Retrived successful',
                data: result
            })
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
    res.send(res.send(`<h1 style="text-align: center; margin-top: 20%;">MediMart Server is Running 🚀</h1>`))
})

app.listen(port, () => {
    console.log(`Medimart server is running on port ${port}`)
})