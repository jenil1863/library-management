const express = require("express");
const app = express();
const HTTP_PORT = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));
app.use(express.static("assets"));

const exphbs = require("express-handlebars");
app.engine(
  ".hbs",
  exphbs.engine({
    extname: ".hbs",
    helpers: {
      json: (context) => {
        return JSON.stringify(context);
      },
    },
  })
);
app.set("view engine", ".hbs");

const session = require("express-session");
app.use(
  session({
    secret: "the quick brown fox jumped over the lazy dog 1234567890",
    resave: false,
    saveUninitialized: true,
  })
);

/// --------------
// DATABASE : Connecting to database and setting up your schemas/models (tables)
/// --------------

const mongoose = require("mongoose");

// The mongodb connection string is in the MongoAtlas web interface
mongoose.connect(
  "mongodb+srv://jenilshah1863:5sPWBSliufPTFXlI@cluster0.t1mq6kq.mongodb.net/?retryWrites=true&w=majority"
);

// TODO: Define schemas
const Schema = mongoose.Schema;

//defining the schema for the user collection

const BooksSchema = new Schema({
  author: String,
  title: String,
  borrowedBy: String,
  image: String,
  description: String,
});

const UsersSchema = new Schema({
  LibraryNumber: String,
});


const Books = mongoose.model("Books_collection", BooksSchema);
const Users = mongoose.model("Customer_collection", UsersSchema);

app.get("/", async (req, res) => {
  const listOfBooks = await Books.find().lean();
  res.render("partials/home", { layout: "primary", books: listOfBooks });
});

app.get("/profile", async (req, res) => {
  const hasLoggedInUser = req.session.hasLoggedInUser; 
  try {
    if (hasLoggedInUser === undefined) {
      UserNotLogged = true;
      res.render("partials/error", { layout: "primary", UserNotLogged });
      return;
    }
    const LoginIdFromUI = req.session.loginCardNumber;

    const BooksBorrowed = await Books.find({
      borrowedBy: LoginIdFromUI,
    }).lean();
    res.render("partials/profile", {
      layout: "primary",
      books: BooksBorrowed,
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/login", async (req, res) => {
  const LoginIdFromUI = req.body.loginCardNumber;

  try {
    const userFromDB = await Users.findOne({ LibraryNumber: LoginIdFromUI });

    if (LoginIdFromUI === "0000" || LoginIdFromUI === "1234") {
      req.session.hasLoggedInUser = true;
      req.session.loginCardNumber = userFromDB.LibraryNumber;
      res.redirect("/");
      return;
    } else {
      res.render("partials/error", {
        layout: "primary",
        invalidLoginId: LoginIdFromUI,
      });
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/login", (req, res) => {
  res.render("partials/login", { layout: "primary" });
});

app.post("/borrow/:id", async (req, res) => {
  const bookId = req.params.id;
  const hasLoggedInUser = req.session.hasLoggedInUser;

  try {
    //check if user is logged in or not
    if (hasLoggedInUser === undefined) {
      UserNotLogged = true;
      res.render("partials/error", { layout: "primary", UserNotLogged });
      return;
    }
    const listOfBooks = await Books.find().lean();
    const userFromDB = await Users.findOne({
      LibraryNumber: req.session.loginCardNumber,
    });
    const bookFromDB = await Books.findOne({ _id: bookId });
    if (userFromDB) {
      bookFromDB.borrowedBy = userFromDB.LibraryNumber;
    } else {
      res.send("no login id found");
      return;
    }

    await bookFromDB.save();
    res.render("partials/home", {
      layout: "primary",
      borrowed: bookFromDB,
      books: listOfBooks,
    });
  } catch (err) {
    console.log(err);
  }
});

app.get("/returnBook/:bookId", async (req, res) => {
  const bookId = req.params.bookId;
  const book = await Books.findById(bookId);

  book.borrowedBy = "";
  await book.save();
  res.redirect("/profile");
});

app.post("/logout", async (req, res) => {
  const listOfBooks = await Books.find().lean();
  try {
    if (req.session.hasLoggedInUser === true) {
      req.session.destroy();
      res.redirect("/");
    } else {
      res.render("partials/home", { layout: "primary", books: listOfBooks });
    }
  } catch (err) {
    console.log(err);
  }
});

// ----------------
const onHttpStart = () => {
  console.log(`Express web server running on port: ${HTTP_PORT}`);
  console.log(`Press CTRL+C to exit`);
};
app.listen(HTTP_PORT, onHttpStart);

