const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cors = require('cors');
const formidable = require('formidable');
var uniqid = require('uniqid');

app.use(cors());
app.use(bodyParser.json());

console.clear();

const secretKey = "ver";

//Create database connection

const conn = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'db_gamefinder'
});

function uploadPhoto(req,res,next){
    var form = new formidable.IncomingForm();
    var productImagePath;

    form.parse(req, (err,fields,files)=>{
        req.body = fields;
    });

    form.on('fileBegin', function (name, file){
        let newImageName = uniqid()+'.'+ file.name.split('.').pop();
        productImagePath = __dirname + '/images/product/' + newImageName;
        file.path = productImagePath;
        productImagePath = 'http://localhost:3000/images/product/' + newImageName;
    });

    form.on('file', function (name, file){
        req.body.workspac_image = productImagePath;
        console.log('Uploaded ' + file.name);
    });

    form.on('end', () => {
        req.body.product_image = productImagePath;
        next();
    });

}


//mysq connection
conn.connect();

//Create server
app.listen(3000,()=>{
    console.log('Server started on port 3000');
});


app.post('/login',(req,res)=>{
    let sql = "SELECT * FROM user WHERE email = ?";
    conn.query(sql,[req.body.email],(err,result)=>{
        if(err) throw err;
        if(result.length == 1){
            if(bcrypt.compareSync(req.body.password, result[0].password)){
                let payload = {
                    user_id : result[0].user_id,
                    firstname: result[0].firstname,
                    lastname: result[0].lastname,
                    email: result[0].email
                };
                res.json({token: jwt.sign(payload,secretKey)});
            } else {
                res.status(404).json({message: "invalid username/password"});
            }
        } else {
            res.status(404).json({message: "invalid username/password"});
        }
    });

});

app.post('/signup',(req,res)=>{
    req.body.password =  bcrypt.hashSync(req.body.password, 5);
    let sql = "INSERT INTO user SET ?";
    
    let query =conn.query(sql,[req.body],(err,result)=>{
        if(err) throw err;
        let payload = {
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            user_id: result.insertId,
            email: req.body.email
        };
        res.json({token: jwt.sign(payload,secretKey)});
    });
});

app.get('/user/:id',verifyToken,(req,res)=>{
    let sql = "SELECT user_id,firstname,lastname,email,contactnum FROM user WHERE user_id = ?";
    conn.query(sql,[req.params.id],(err,result)=>{
        if(err) throw err;
        res.json(result[0]);
    });
});

app.post('/product',[verifyToken,uploadPhoto], (req,res)=>{
    req.body['user_id'] = req.token.user_id;
    let sql = "INSERT INTO product SET ?";
    conn.query(sql,[req.body], (err,result) =>{
        console.log(result.space_id);
        let sql2 = "INSERT INTO availability SET ?";
        conn.query(sql2, {space_id: result.space_id}, (err, result) => {
            
        });

        if(err) throw err;
        res.json({message: "product inserted"});
    });
}); 

app.get('/product', (req,res)=>{
    let sql = "SELECT * FROM product_type WHERE isVerify = 1 ORDER BY space_id Desc";
    conn.query(sql,(err,result)=>{
        if(err) throw err;
        res.json(result);
    });
});

app.get('/tabgames', (req,res)=>{
    let sql = "SELECT * FROM product_type WHERE isVerify = 1 AND type='game' ORDER BY space_id Desc";
    conn.query(sql,(err,result)=>{
        if(err) throw err;
        res.json(result);
    });
});
app.get('/tabconsoles', (req,res)=>{
    let sql = "SELECT * FROM product_type WHERE isVerify = 1 AND type='console' ORDER BY space_id Desc";
    conn.query(sql,(err,result)=>{
        if(err) throw err;
        res.json(result);
    });
});





app.get('/product_type/:id',verifyToken, (req,res)=>{
    let product_id = req.params.id;
    let sql = "SELECT * FROM product_type WHERE space_id = ? ";
    conn.query(sql, [product_id], (err,result)=>{
        if(err) throw err;
        res.json(result[0]);
    });
});

app.get('/product_type/user/:id',verifyToken, (req,res)=>{
    let product_id = req.params.id;
    let sql = "SELECT * FROM product WHERE user_id = ? AND isVerify = 1 ORDER BY space_id Desc";
    conn.query(sql, [product_id], (err,result)=>{
        if(err) throw err;
        res.json(result);
    });
});


app.post('/product-verify',(req,res)=>{
    let sql = "UPDATE product SET isVerify = !isVerify WHERE space_id = ? ";
    conn.query(sql,[req.body.space_id],(err,result)=>{
        if(err) throw err;
        console.log('worked');
        res.json({message: "updated"});
    });
});

app.get('/product-all', (req,res)=>{
    let sql = "SELECT product.* , user.firstname, user.lastname FROM product LEFT JOIN user on user.user_id = product.user_id ORDER BY space_id Desc";
    conn.query(sql,(err,result)=>{
        if(err) throw err;
        res.json(result);
    });
});


app.delete('/product',verifyToken,(req,res)=>{
    console.log(req.body.space_id);

    let sql = "DELETE FROM product WHERE space_id = ? ";
    conn.query(sql,[req.body.space_id],(err,result)=>{
        if(err) throw err;
        res.json({message: "deleted from database"});
    });
});

// app.post('/notification',verifyToken, (req,res)=>{
//     let sql = "INSERT INTO notification SET ?";
//     req.body['from_user'] = req.token.user_id;
//     conn.query(sql,[req.body],(err,result)=>{
//         if(err) throw err;
//         console.log(result);
//         res.json({message: "Notification sent!"});
//     });
// });

// app.delete('/notification',verifyToken,(req,res)=>{
//     console.log(req);
//     let sql = "DELETE FROM notification WHERE notification_id = ? ";
//     conn.query(sql,[req.body.notification_id],(err,result)=>{
//         if(err) throw err;
//         res.json({message: "deleted from database"});
//     });
// });


// app.post('/notification/confirm',verifyToken, (req,res)=>{
//     if(req.body.type == 1){
//         let updateData = {
//             to_user: req.body.from_user,
//             from_user: req.body.to_user,
//             type: 2
//         };
//         let sql = "UPDATE notification SET ? ";
//         conn.query(sql, [updateData],(err,result)=>{
//             if(err) throw err;
//             res.json({message: "notification confirm"});
//         });
//     }
// });

// app.get('/notification',verifyToken,(req,res)=>{
//     let sql = `SELECT notification.* , user.firstname, user.lastname 
//     FROM notification 
//     LEFT JOIN user on user.user_id = notification.from_user 
//     WHERE notification.to_user = ? ORDER BY notification_id Desc`;
//     conn.query(sql,[req.token.user_id],(err,result)=>{
//         if(err) throw err;
//         res.json(result);
//     });
// });

// app.get('/notification/:id',verifyToken, (req,res)=>{
//     let notification_id = req.params.id;
//     let sql = "SELECT * FROM notification WHERE notification_id = ? ";
//     conn.query(sql, [notification_id], (err,result)=>{
//         if(err) throw err;
//         res.json(result[0]);
//     });
// });

// app.post('/feed',verifyToken, (req,res)=>{
//     let sql = "INSERT INTO feed(user_id,message) VALUES(?)";
//     let insert = [req.token.user_id, req.body.message];
//     conn.query(sql,[insert],(err,result) =>{
//         if(err) throw err;
//         res.json({message: "feed inserted"});
//     });
// });

// app.get('/feed',verifyToken, (req,res)=>{
//     let sql = "SELECT * FROM feed ORDER BY feed_id Desc";
//     conn.query(sql,(err,result)=>{
//         if(err) throw err;
//         res.json(result);
//     });
// });

// app.post('/opening-hours', verifyToken, (req, res) => {
//     const sql = "INSERT INTO opening_hours SET ?";
//     conn.query(sql, req.body, (err,result)=>{
//         if(err) return res.status(500).json({error: err});
//         res.json({message: "Success!"});
//     });
// });

function verifyToken(req,res,next){
    res.setHeader('Content-type','Application/json');
    const bearerHeader = req.headers['authorization'];
    if(bearerHeader !== 'undefined'){
        const bearerToken = bearerHeader.split(' ')[1];
        jwt.verify(bearerToken,secretKey , (err,result) =>{
            if(err){
                res.status(403).json({message: err.message});
            } else {
                req.token = result;
                next();
            }
        });
    } else {
        res.status(403).json({message: "Token missing from header"});
    }
}

//serve images
app.use('/images',express.static('images'));
