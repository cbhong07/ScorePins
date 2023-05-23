const addUsername = (req, res, next) => {
    res.locals.username = req.session.userid;
    next();
};

module.exports = { addUsername };