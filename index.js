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
    ],
    credentials: true
}));
app.use(express.json())
app.use(cookieParser())



//  custom middle wire 

const verifyToken = (req, res, next) => {
    const token = req.cookies.token
    console.log("this is token", token)
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






const { MongoClient, ServerApiVersion } = require('mongodb');
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
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // auth realated api 
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res
                .cookie('token', token, cookieOptions )
                .send({ success: true })
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('logging out', user);
            res.clearCookie('token  ', { ...cookieOptions, maxAge: 0 }).send({ success: true })
        })




        app.get('/categories', async (req, res) => {
            const result = await categoryCollection.find().toArray();
            res.send(result)
        })
        app.get('/books', verifyToken, async (req, res) => {
            const result = await allBooksCollection.find().toArray();
            res.send(result)
        })

        app.post('/addbooks', verifyToken, async (req, res) => {
            const bookDetail = req.body;
            console.log(bookDetail)
            const result = await allBooksCollection.insertOne(bookDetail)
            res.send(result);
        })
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