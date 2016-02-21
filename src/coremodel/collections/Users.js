"use strict";

import User from './../User';
import Provider from './../../Provider';
import logger from './../../Logger';

class Users {

    constructor(provider) {
        if (!provider instanceof Provider) {
            throw new Error("Parameter provider must be an instance of provider");
        }
        this.provider = provider;
        this.validUsers = [];
        this.userCategories = [];
    }

    add(user) {
        if (user instanceof User) {
            var mUser = this.findUserByName(user.name);
            if (!mUser) {
                mUser = this.findUserByUid(user.uid);
                if (mUser) {
                    logger.logAndThrow(`User ${user.name} already exists with uid ${mUser.uid}.`);
                }
                this.validUsers.push(user);
            } else {
                logger.logAndThrow(`User ${user.name} already exists.`);
            }
        } else {
            logger.logAndThrow('The parameter user needs to be of type User.');
        }
    }

    //find a user in an array of User objects.
    //if the 2nd parameter is not provided it defaults to the
    //array of validUsers contained in Users.
    findUser(user, validUsers) {
        if (!validUsers) {
            validUsers = this.validUsers;
        }
        if (user instanceof User) {
            return validUsers.find((muser)=> {
                return muser.equals(user);
            });
        } else {
            logger.logAndThrow(`The parameter user is not an instance of User.`);
        }
    }

    findUserByName(user) {
        if (typeof user === 'string') {
            return this.validUsers.find((muser)=> {
                if (muser.name === user){
                    return muser;
                }
            });
        } else {
            logger.logAndThrow(`The parameter user should be a user name string.`);
        }
    }

    findUserByUid(uid) {
        if (!uid) {
            logger.warn("uid is undefined.");
            return;
        }
        if (typeof uid === 'number') {
            return this.validUsers.find((muser)=> {
                return muser.uid === uid;
            });
        } else {
            logger.logAndThrow(`The parameter uid should be a number.`);
        }
    }

    export() {
        var obj = [];
        this.validUsers.forEach((user, index)=> {
            obj.push(user.export());
        });
        return obj;
    }

    import(userdata, errors) {
        userdata.forEach((data) => {
            try {
                var user = new User(data);
                this.add(user);
            } catch (e) {
                logger.logAndAddToErrors(`Error validating user. ${e.message}`, errors);
            }
        });
    }

    clear() {
        this.validUsers = [];
    }

}

export default Users;