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
            const isExist = await categories.findOne({ _id: new ObjectId(req.params.id) })
            if (!isExist) {
                return sendResponse(res, {
                    success: false,
                    statusCode: 404,
                    message: 'Category not exist'
                })
            }

            const result = await categories.deleteOne({ _id: isExist._id }, { returnDocument: 'after' })

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



        // Add a new medicine
        app.post("/products", verifyToken, async (req, res) => {
            const {
                name,
                genericName,
                description,
                image,
                category,
                company,
                massUnit,
                price,
                discount = 0,
            } = req.body;

            // validation check
            if (
                !name ||
                !genericName ||
                !price ||
                !massUnit ||
                !category ||
                !company
            ) {
                return sendResponse(res, {
                    success: false,
                    statusCode: 400,
                    message: "Required fields are missing",
                });
            }

            const newMedicine = {
                name,
                genericName,
                description,
                image,
                category,
                company,
                massUnit,
                price,
                discount,
                createdAt: new Date(),
            };

            const result = await products.insertOne(newMedicine);

            sendResponse(res, {
                success: true,
                message: "Medicine added successfully",
                data: result,
            });
        });

        // Get all medicines
        app.get("/products", verifyToken, async (req, res) => {
            const sellerEmail = req.query.email;
            const query = sellerEmail ? { sellerEmail } : {};

            const result = await products.find(query).toArray();

            sendResponse(res, {
                success: true,
                message: "Medicines fetched successfully",
                data: result,
            });
        });

        // Get a single medicine by ID
        app.get("/products/:id", async (req, res) => {
            const { id } = req.params;

            try {
                const result = await products.findOne({ _id: new ObjectId(id) });

                if (!result) {
                    return sendResponse(res, {
                        success: false,
                        statusCode: 404,
                        message: "Product not found",
                    });
                }

                sendResponse(res, {
                    success: true,
                    message: "Product fetched successfully",
                    data: result,
                });
            } catch (error) {
                sendResponse(res, {
                    success: false,
                    statusCode: 500,
                    message: "Something went wrong",
                });
            }
        });

        // Update a medicine
        app.patch("/products/:id", async (req, res) => {
            const { id } = req.params;
            const updateData = req.body;

            try {
                const result = await products.findOneAndUpdate(
                    { _id: new ObjectId(id) },
                    { $set: updateData },
                    { returnDocument: "after" }
                );

                sendResponse(res, {
                    success: true,
                    message: "Product updated successfully",
                    data: result,
                });
            } catch (error) {
                sendResponse(res, {
                    success: false,
                    statusCode: 500,
                    message: "Something went wrong",
                });
            }
        });

        // Delete a medicine
        app.delete("/products/:id", async (req, res) => {
            const { id } = req.params;

            try {
                const isExist = await products.findOne({ _id: new ObjectId(id) });

                if (!isExist) {
                    return sendResponse(res, {
                        success: false,
                        statusCode: 404,
                        message: "Product not found",
                    });
                }

                const result = await products.deleteOne({ _id: isExist._id });

                sendResponse(res, {
                    success: true,
                    message: "Product deleted successfully",
                    data: result,
                });
            } catch (error) {
                sendResponse(res, {
                    success: false,
                    statusCode: 500,
                    message: "Something went wrong",
                });
            }
        });



        // ----------------- Order -------------------
        // create order
        app.post("/orders", verifyToken, async (req, res) => {
            const { iat, exp, ...user } = req.user
            const payload = {
                ...req.body,
                user: user,
                status: 'pending',
                createdAt: new Date(),
            };

            try {
                const result = await orders.insertOne(payload, { returnDocument: 'after' });

                sendResponse(res, {
                    success: true,
                    message: "Order added successfully",
                    data: result,
                });
            } catch (error) {
                sendResponse(res, {
                    success: false,
                    message: "Failed to created order",
                });
            }
        });

        // update order
        app.patch("/orders/:id", verifyToken, async (req, res) => {
            try {
                const result = await orders.findOneAndUpdate({ _id: new ObjectId(req.params.id) }, { $set: req.body }, { returnDocument: 'after' })

                sendResponse(res, {
                    success: true,
                    message: "Order updated successfully",
                    data: result,
                });
            } catch (error) {
                sendResponse(res, {
                    success: false,
                    message: "Failed to update order",
                });
            }
        });

        // get my orders
        app.get("/orders", verifyToken, async (req, res) => {

            try {
                const result = await orders.find({ 'user._id': req.user?._id }).toArray();

                sendResponse(res, {
                    success: true,
                    message: "Order added successfully",
                    data: result,
                });
            } catch (error) {
                sendResponse(res, {
                    success: false,
                    message: "Failed to created order",
                });
            }
        });


        // ---------------- Payment ------------------
        // create payment
        app.post("/payments", verifyToken, async (req, res) => {
            const { iat, exp, ...user } = req.user
            const payload = {
                ...req.body,
                user: user,
                status: 'pending',
                createdAt: new Date(),
            };

            try {
                const result = await payments.insertOne(payload, { returnDocument: 'after' });

                sendResponse(res, {
                    success: true,
                    message: "Payment added successfully",
                    data: result,
                });
            } catch (error) {
                sendResponse(res, {
                    success: false,
                    message: "Failed to created payment",
                });
            }
        });

        // update payment
        app.patch("/payments/:id", verifyToken, async (req, res) => {
            try {
                const result = await payments.findOneAndUpdate({ _id: new ObjectId(req.params.id) }, { $set: req.body }, { returnDocument: 'after' });

                sendResponse(res, {
                    success: true,
                    message: "Payment updated successfully",
                    data: result,
                });
            } catch (error) {
                sendResponse(res, {
                    success: false,
                    message: "Failed to update payment",
                });
            }
        });

        // get all payments
        app.get("/payments", verifyToken, async (req, res) => {
            try {
                const result = await payments.find().toArray();

                sendResponse(res, {
                    success: true,
                    message: "Payments fetched successfully",
                    data: result,
                });
            } catch (error) {
                console.error("Payment fetch error:", error);
                sendResponse(res, {
                    success: false,
                    message: "Failed to get payments",
                });
            }
        });

          // get user payments
        app.get("/payments/my-payments", verifyToken, async (req, res) => {
            try {
                const result = await payments.find({"user._id": req.user?._id}).toArray();

                sendResponse(res, {
                    success: true,
                    message: "Payments fetched successfully",
                    data: result,
                });
            } catch (error) {
                console.error("Payment fetch error:", error);
                sendResponse(res, {
                    success: false,
                    message: "Failed to get payments",
                });
            }
        });

        // ----------------- ad banner --------------------
        // create ad-banner
        app.post("/banners", verifyToken, async (req, res) => {
            const { iat, exp, ...user } = req.user
            const payload = {
                ...req.body,
                seller: user,
                isActive: true,
                createdAt: new Date(),
            };

            try {
                const result = await banners.insertOne(payload, { returnDocument: 'after' });

                sendResponse(res, {
                    success: true,
                    message: "Ad-banner added successfully",
                    data: result,
                });
            } catch (error) {
                sendResponse(res, {
                    success: false,
                    message: "Failed to created Ad-banner",
                });
            }
        });

        // update ad-banner
        app.patch("/banners/:id", verifyToken, async (req, res) => {
            try {
                const result = await banners.findOneAndUpdate({_id: new ObjectId(req.params.id) }, {$set: req.body}, { returnDocument: 'after' });

                sendResponse(res, {
                    success: true,
                    message: "Ad-banner updated successfully",
                    data: result,
                });
            } catch (error) {
                sendResponse(res, {
                    success: false,
                    message: "Failed to update Ad-banner",
                });
            }
        });

        // get all ad-banner
        app.get("/banners", verifyToken, async (req, res) => {
            try {
                const result = await banners.find().toArray()

                sendResponse(res, {
                    success: true,
                    message: "Ad-banner get successfully",
                    data: result,
                });
            } catch (error) {
                sendResponse(res, {
                    success: false,
                    message: "Failed to get Ad-banner",
                });
            }
        });

        // get seller ad-banner
        app.get("/banners/my-banners", verifyToken, async (req, res) => {
            try {
                const result = await banners.find({"seller._id": req.user?._id}).toArray()

                sendResponse(res, {
                    success: true,
                    message: "Ad-banner get successfully",
                    data: result,
                });
            } catch (error) {
                sendResponse(res, {
                    success: false,
                    message: "Failed to get Ad-banner",
                });
            }
        });

        // delete ad-banner
        app.delete("/banners/:id", verifyToken, async (req, res) => {
            // check if exist
            const isExist = await banners.findOne({_id: new ObjectId(req.params.id)})
            if(!isExist){
                sendResponse(res, {
                    success: false,
                    statusCode: 401,
                    message: "Ad-banner is not exist",
                });
            }
            
            try {
                const result = await banners.findOneAndDelete({_id: new ObjectId(req.params.id)})

                sendResponse(res, {
                    success: true,
                    message: "Ad-banner deleted successfully",
                    data: result,
                });
            } catch (error) {
                sendResponse(res, {
                    success: false,
                    message: "Failed to deleted Ad-banner",
                });
            }
        });


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