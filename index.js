const express = require('express')
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');
const port = process.env.PORT || 4000;

require('dotenv').config()


app.use(cors({
    origin: [
        'http://localhost:5173',
        "https://bookzone-7c036.web.app",
        "https://bookzone-7c036.firebaseapp.com"
    ],
    credentials: true
}));
app.use(express.json())
app.use(cookieParser())



//  custom middle wire 

const verifyToken = (req, res, next) => {
    const token = req.cookies.token

    if (!token) {
        return res.status(401).send({ massage: 'unauthorized access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ massage: 'unauthorized access' })
        }
        req.user = decoded
        next()
    })
}






const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zqymdgy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
    try {
        const categoryCollection = client.db("bookzone").collection("Categories");
        const allBooksCollection = client.db("bookzone").collection("books");
        const allBorrowBooksCollection = client.db("bookzone").collection("borrowBooks");
        const userCollection = client.db("bookzone").collection("users");
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // auth realated api 

        // middleware






        app.post('/jwt', async (req, res) => {
            const user = req.body;

            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res
                .cookie('token', token, cookieOptions)
                .send({ success: true })
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;

            res.clearCookie('token  ', { ...cookieOptions, maxAge: 0 }).send({ success: true })
        })



        // book related api
        app.put('/update/:id', async (req, res) => {
            const id = req.params.id;
            const updatedBookData = req.body;
            const query = { _id: new ObjectId(id) };
            const options = { upsert: true };

            const updateData = {
                $set: {
                    "bookData.image": updatedBookData.image,
                    "bookData.name": updatedBookData.name,
                    "bookData.author": updatedBookData.author,
                    "bookData.category": updatedBookData.category,
                    "bookData.rating": updatedBookData.rating,
                }
            }
            const result = await allBooksCollection.updateOne(query, updateData, options);

            res.send(result)
        })
        app.post('/updatequantity/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await allBooksCollection.updateOne(query,
                { $inc: { "bookData.quantity": -1 } }
            );
            res.send(result);
        });
        app.post('/returnBookQuantity/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await allBooksCollection.updateOne(query,
                { $inc: { "bookData.quantity": 1 } }
            );
            res.send(result);
        });


        app.get('/categories', async (req, res) => {
            const result = await categoryCollection.find().toArray();
            res.send(result)
        })
        app.get('/category/:category', async (req, res) => {
            const category = req.params.category;

            const query = { "bookData.category": category }
            const result = await allBooksCollection.find(query).toArray();
            res.send(result)
        })
        app.get('/books/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(category)
            const query = { _id: new ObjectId(id) }
            const result = await allBooksCollection.findOne(query);
            res.send(result)
        })
        app.get('/quantity', async (req, res) => {
            const query = { "bookData.quantity": { $gt: 0 } };

            const result = await allBooksCollection.find(query).toArray();
            res.send(result);
        });
        app.get('/books', async (req, res) => {
            const result = await allBooksCollection.find().toArray();
            res.send(result)
        })

        app.post('/addbooks', verifyToken, async (req, res) => {
            const bookDetail = req.body;

            const result = await allBooksCollection.insertOne(bookDetail)
            res.send(result);
        })
        app.post('/addBorrowBook', async (req, res) => {
            const BorrowDetail = req.body;
            const emailQuary = req.body.email;
            const quary = req.body.bookId;
            const existingDocument = await allBorrowBooksCollection.findOne({ email: emailQuary, bookId: quary });
            // const existingEmailData = await allBorrowBooksCollection.find({ email: emailQuary });
            // console.log(existingDocument)
            if (existingDocument) {
                res.status(400).json({ message: 'Duplicate document: This book has already been borrowed.' })
            } else {
                const result = await allBorrowBooksCollection.insertOne(BorrowDetail);
                res.send(result);
            }



        })

        app.post('/users', async (req, res) => {
            const user = req.body;

            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        app.get('/borrowedBooks/:email', async (req, res) => {
            const email = req.params.email;
            const quary = { email: email }
            const result = await allBorrowBooksCollection.find(quary).toArray();
            res.send(result);
        })
        app.delete('/returnBook/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };


            const result = await allBorrowBooksCollection.deleteOne(query);
            res.send(result)
        })




        app.post('/search', async (req, res) => {
            const query = req.body.query.toLowerCase();
            // console.log(query)
            try {
                //   const allBooksCollection = client.db("bookzone").collection("books");
                const results = await allBooksCollection.find({
                    $or: [
                        { "bookData.name": { $regex: query, $options: 'i' } },
                        { "bookData.author": { $regex: query, $options: 'i' } }
                    ]
                }).toArray();
                res.json(results);
            } catch (error) {
                console.error('Error searching:', error);
                res.status(500).json({ error: 'An error occurred while searching' });
            }
        });
        app.get('/', (req, res) => {
            res.send('Hello World!')
        })
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})