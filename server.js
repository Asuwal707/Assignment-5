/*********************************************************************************
*  WEB700 – Assignment 06
*  I declare that this assignment is my own work in accordance with Seneca Academic Policy. No part
*  of this assignment has been copied manually or electronically from any other source
*  (including 3rd party web sites) or distributed to other students.
* 
*  Name: aashish Student ID: 161760236 Date:8/03/2024
*
********************************************************************************/

const express = require('express');
const app = express();
const path = require('path');
const collegeData = require('./modules/collegeData');
const exphbs = require('express-handlebars');

const bodyParser = require('body-parser');
require('dotenv').config(); // the all new .env config for port

//  Handlebars helpers
const hbs = exphbs.create({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    helpers: {
        navLink: function(url, options) {
            return '<li' + 
                ((url == app.locals.activeRoute) ? ' class="nav-item active" ' : ' class="nav-item" ') + 
                '><a class="nav-link" href="' + url + '">' + options.fn(this) + '</a></li>';
        },
        equal: function(lvalue, rvalue, options) {
            if (arguments.length < 3) {
                throw new Error("Handlebars Helper equal needs 2 parameters");
            }
            if (lvalue != rvalue) {
                return options.inverse(this);
            } else {
                return options.fn(this);
            }
        }
    },
    runtimeOptions: {
        protoAccess: 'allow'
    }
});

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to serve static files from the 'public' directory
app.use(express.static('public'));

// Middleware for Nav
app.use(function(req, res, next) {
    let route = req.path.substring(1);
    app.locals.activeRoute = "/" + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, "") : route.replace(/\/(.*)/, ""));
    next();
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Initializing our database
collegeData.initialize().then(() => {
    console.log('Database initialized');
}).catch(err => {
    console.error('Database initialization failed:', err);
});

// route 1.3

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/about', (req, res) => {
    res.render('about');
});

app.get('/htmlDemo', (req, res) => {
    res.render('htmlDemo');
});

// Display all students
app.get('/students', (req, res) => {
    collegeData.getAllStudents().then(students => {
        // Converting Sequelize model instances to plain objects
        const plainStudents = students.map(student => student.get({ plain: true }));

        console.log('Students Data:', plainStudents); // Log to verify

        if (plainStudents.length > 0) {
            res.render('students', { students: plainStudents });
        } else {
            res.render('students', { message: "No students found" });
        }
    }).catch(err => {
        console.error('Error fetching students:', err); // Log errors
        res.render('students', { message: "Error fetching students" });
    });
});

// hbs config
app.set('view engine', '.hbs');

// Displaying student by studentNum
app.get('/student/:studentNum', (req, res) => {
    let viewData = {};

    collegeData.getStudentByNum(req.params.studentNum)
        .then(data => {
            if (data) {
                viewData.student = data.get({ plain: true });
            } else {
                viewData.student = null;
            }
        })
        .catch(() => {
            viewData.student = null;
        })
        .then(() => collegeData.getCourses())
        .then(data => {
            viewData.courses = data.map(course => course.get({ plain: true }));
            viewData.courses.forEach(course => {
                if (course.courseId === viewData.student.courseId) {
                    course.selected = true;
                }
            });
        })
        .catch(() => {
            viewData.courses = [];
        })
        .then(() => {
            if (viewData.student === null) {
                res.status(404).send("Student Not Found, Please Enter valid details");
            } else {
                res.render("student", { viewData: viewData });
            }
        });
});

// Add a new student
app.get('/students/add', (req, res) => {
    collegeData.getCourses().then((courses) => {
        const plainCourses = courses.map(course => course.get({ plain: true }));
        res.render('addStudent', { courses: plainCourses });
    }).catch(() => {
        res.render('addStudent', { courses: [] });
    });
});

app.post('/students/add', (req, res) => {
    const studentData = { ...req.body };
    if (studentData.courseId === "") {
        studentData.courseId = null;
    }
    
    collegeData.addStudent(studentData).then(() => {
        res.redirect('/students');
    }).catch((err) => {
        console.error('Error:', err);
        res.status(500).send("Unable to add student, Please Enter valid details");
    });
});

// Update student details
app.post('/student/update', (req, res) => {
    collegeData.updateStudent(req.body).then(() => {
        res.redirect('/students');
    }).catch(err => {
        res.status(500).send('Unable to update student, Please Enter valid details');
    });
});

// Delete a student
app.get('/student/delete/:studentNum', (req, res) => {
    collegeData.deleteStudentByNum(req.params.studentNum).then(() => {
        res.redirect('/students');
    }).catch(() => {
        res.status(500).send('Unable to remove student, Please Try Again');
    });
});

// Display all courses
app.get('/courses', (req, res) => {
    collegeData.getCourses().then(courses => {
        const plainCourses = courses.map(course => course.get({ plain: true }));
        if (plainCourses.length > 0) {
            res.render('courses', { courses: plainCourses });
        } else {
            res.render('courses', { message: "No courses found, Please Try Again" });
        }
    }).catch(err => {
        res.render('courses', { message: "Error fetching courses" });
    });
});

// Display course details by courseId
app.get('/course/:courseId', (req, res) => {
    collegeData.getCourseById(req.params.courseId).then(course => {
        res.render('course', { course: course });
    }).catch(() => {
        res.status(404).send('Course not found, Please Try Again');
    });
});

// Add a new course
app.get('/courses/add', (req, res) => {
    res.render('addCourse');
});

app.post('/courses/add', (req, res) => {
    collegeData.addCourse(req.body).then(() => {
        res.redirect('/courses');
    }).catch((err) => {
        console.error(err);
        res.status(500).send("Unable to add course, Please Try Again");
    });
});

// Delete a course
app.get('/course/delete/:courseId', (req, res) => {
    collegeData.deleteCourseById(req.params.courseId).then(() => {
        res.redirect('/courses');
    }).catch(() => {
        res.status(500).send('Cannot Delete Course, Please Try Again');
    });
});

// Update course details
app.post('/course/update', (req, res) => {
    collegeData.updateCourse(req.body).then(() => {
        res.redirect('/courses');
    }).catch(err => {
        res.status(500).send('Unable to update course, Please Try Again');
    });
});

// this is our middleware used to handle 404 errors
app.use((req, res) => {
    res.status(404).send("Page Not Found, lol you cooked");
  });

// Start server
const PORT = process.env.HTTP_PORT || 8080; // Define PORT
app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});