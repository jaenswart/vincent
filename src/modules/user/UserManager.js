"use strict";

import User from './User';
import Host from '../host/Host';
import HostUI from '../host/ui/console/Host';
import UserUI from './ui/console/User';
import UserAccountUI from './ui/console/UserAccount';
import UserManagerUI from './ui/console/UserManager';
import UserAccount from './UserAccount';
import Provider from './../../Provider';
import logger from './../../Logger';
import PermissionsManager from '../base/PermissionsManager';
import ModuleLoader from '../../utilities/ModuleLoader';
import Vincent from '../../Vincent';


class UserManager extends PermissionsManager {

    constructor(provider) {
        if (!provider instanceof Provider || !provider) {
            throw new Error("Parameter provider must be an instance of provider");
        }
        super();
        this.provider = provider;
        this.validUsers = [];
        this.errors = [];
        this.engines = ModuleLoader.loadEngines('user', provider);
        this.owner = "root"; //default owner
        this.group = "useradmin"; //default group
        this.permissions = 664; //default permissions
    }

    exportToEngine(engine, host, struct) {
        this.engines[engine].exportToEngine(host, struct);
    }


    /**
     * The list of users which are valid for this database
     * @param user
     */
    addValidUser(user) {
        if (user instanceof User) {
            var mUser = this.findValidUserByName(user.name);
            if (!mUser) {
                mUser = this.findValidUserByUid(user.uid);
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

    /**
     *
     *find a user in an array of User objects.
     *if the 2nd parameter is not provided it defaults to the
     *array of validUsers contained in UserManager.
     *
     * @param user
     * @param validUsers
     * @returns {*}
     */
    findValidUser(user, validUsers) {
        if (!validUsers) {
            validUsers = this.validUsers;
        }
        if (user instanceof User) {
            return validUsers.find((muser)=> {
                return muser.equals(user);
            });
        }
        if (typeof user === "string") {
            return this.findValidUserByName(user);
        } else {
            logger.logAndThrow(`The parameter user is not an instance of User nor a string user name.`);
        }
    }

    /**
     * Find a User object by name(key)
     * @param user
     * @returns {T}
     */
    findValidUserByName(user) {
        if (typeof user === 'string') {
            return this.validUsers.find((muser)=> {
                if (muser.name === user) {
                    return muser;
                }
            });
        } else {
            logger.logAndThrow(`The parameter user should be a user name string.`);
        }
    }

    /**
     * Find a user by their uid
     * @param uid
     * @returns {T}
     */
    findValidUserByUid(uid) {
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
        var obj = {
            owner: this.owner,
            group: this.group,
            permissions: this.permissions.toString(8),
            users: []
        };

        this.validUsers.forEach((user)=> {
            obj.users.push(user.export());
        });

        return obj;
    }

    loadFromJson(userDef) {
        let owner = userDef.owner;
        let group = userDef.group;
        let permissions = userDef.permissions;
        if (Array.isArray(userDef.users)) {
            userDef.users.forEach((data) => {
                try {
                    var user = new User(data);
                    this.addValidUser(user);
                } catch (e) {
                    logger.logAndAddToErrors(`Error validating user. ${e.message}`, this.errors);
                }
            });
        } else {
            throw new Error("UserDef.users must be an array of users' data");
        }
    }

    loadFromFile() {
        if (this.provider.fileExists("users.json")) {
            let loc = "users.json";
            let data = this.provider.loadFromFile(loc);
            if (data) {
                return this.loadFromJson(data);
            }
        } else {
            logger.warn("users.json file not found");
        }
    }


    clear() {
        this.validUsers = [];
    }

    getUserAccounts(host) {
        return host.data.users;
    }

    // updateUserUid(user, uid) {
    //     let _user = this.findValidUser(user)
    //     if (_user) {
    //         if (this.findValidUserByUid(uid)) {
    //             throw new Error("A user with the uid already exists");
    //         } else {
    //             _user.data.uid = uid;
    //         }
    //     }
    // }

    addUserAccountToHost(host, userAccount, fromUserCategory = false) {
        if (!host instanceof Host) {
            logger.logAndThrow("Parameter host must be of type Host");
        }
        //update host for userAccounts
        if (!host.data.users) {
            host.data.users = [];
        }

        if (!host._export.users) {
            host._export.users = [];
        }

        if (userAccount instanceof UserAccount) {
            if (this.findValidUser(userAccount.user)) {
                var foundUserAccount = this.findUserAccountForHost(host, userAccount);
                if (foundUserAccount) {
                    logger.info(`User ${userAccount.user.name} already exists on host,merging authorized_keys.`);
                    this.mergeUserAccount(host, foundUserAccount, userAccount);
                } else {
                    host.data.users.push(userAccount);
                    userAccount.host = host;
                    if (!fromUserCategory) {
                        host._export.users.push(userAccount.export());
                    }
                }
                Array.prototype.push.apply(host.errors, userAccount.errors);
            } else {
                logger.logAndThrow(`User ${userAccount.user.name} was not found in the valid users list.`);
            }
        } else {
            logger.logAndThrow("The parameter userAccount must be of type UserAccount.");
        }
    }

    mergeUserAccount(host, existingUser, newUser) {
        //merge user objects
        existingUser.merge(newUser);
        //update the exports data structure
        host._export.users.find((user, index)=> {
            if (user.name === existingUser.name) {
                host._export.users.splice(index, 1);
                host._export.users.push(existingUser.export());
                return user;
            }
        });
    }

    findUserAccountForHost(host, hostUser) {
        return host.data.users.find((huser)=> {
            if (huser.user.equals(hostUser.user)) {
                return huser;
            }
        });
    }

    findUserAccountForHostByUserName(host, userName) {
        return host.data.users.find((userAccount) => {
            if (userAccount.name === userName) {
                return userAccount;
            }
        });
    }

    updateHost(hosts, host, hostDef) {
        if (hostDef.users) {
            hostDef.users.forEach(
                (userDef) => {
                    try {
                        let userAccount = new UserAccount(host.provider, userDef);
                        this.addUserAccountToHost(host, userAccount);
                        Array.prototype.push.apply(
                            hosts.errors[host.name],
                            userAccount.errors);
                    } catch (e) {
                        logger.logAndAddToErrors(`Error adding host user - ${e.message}`,
                            hosts.errors[host.name]);
                    }
                });
        }

    }


    /**
     * Function to allow modules to manipulate the repl context to add functionality
     * @param context
     * @param appUser
     */
    loadConsoleUIForSession(context, appUser) {

        let self = this;
        if (!HostUI.prototype.addUserAccount) {
            HostUI.prototype.addUserAccount = function (user) {
                let func = function (appUserP, permObj) {
                    var userAccount = new UserAccountUI(user, this, appUserP);
                    console.log(`User account added for ${user.name ? user.name : user} to host ${this.name}.`);
                    return userAccount;
                };
                func = func.bind(this);
                return this._writeAttributeWrapper(func);
            };
        }

        if (!HostUI.prototype.listUserAccounts) {
            HostUI.prototype.listUserAccounts = function () {
                try {
                    let host = self.provider.managers.hostManager.findValidHost(this.name);
                    return Vincent.app.provider._readAttributeCheck(data.get(this).appUser, data.get(this).permObj, ()=> {
                        let userAccounts = self.getUserAccounts(host);
                        if (userAccounts) {
                            return userAccounts.map((userAcc)=> {
                                return new UserAccountUI(userAcc);
                            });
                        } else {
                            return `No user accounts defined for host ${this.name}`;
                        }
                    });
                } catch (e) {
                    console.log(e);
                    return false;
                }
            }
        }

        if (!HostUI.prototype.getUserAccount) {
            HostUI.prototype.getUserAccount = function (username) {
                try {
                    let host = self.provider.managers.hostManager.findValidHost(this.name);
                    return Vincent.app.provider._readAttributeCheck(data.get(this).appUser, data.get(this).permObj, ()=> {
                        let userAccount = self.findUserAccountForHostByUserName(host, username);
                        if (userAccount) {
                            return new UserAccountUI(userAccount, data.get(this).appUser);
                        } else {
                            console.log(`No user accounts defined for host ${this.name}`);
                            return false;
                        }
                    });
                } catch (e) {
                    console.log(e);
                    return false;
                }
            };
        }
        context.userManager = new UserManagerUI(appUser);
    }


    static getDependencies() {
        return [];
    }

    save(backup = true) {
        return this.provider.saveToFile("users.json", this, backup);
    }

    findHostsWithUser(user) {
        if (typeof user === "string") {
            user = this.provider.userManager.findValidUser(user);
        }
        if (user instanceof User) {
            let hosts = this.provider.managers.hostManager.validHosts.filter((host)=> {
                if (this.getUserAccountForUser(host, user)) {
                    return host;
                }
            });
            return hosts;
        } else {
            throw new Error("Parameter user must be a username or instance of User.");
        }
    }


    getUserAccountForUser(host, user) {
        if (host instanceof Host && user instanceof User) {
            let userAccounts = this.getUserAccounts(host);
            let userAccount = userAccounts.find((userAccount)=> {
                if (userAccount.user.name === tUser.name) {
                    return userAccount;
                }
            });
            return userAccount;
        } else {
            throw new Error("Host parameter must be an instance of Host and user parameter must be an instance of User");
        }
    }

    changeUserState(user, state) {
        let tuser;
        if ((typeof user === 'string') || user instanceof User) {
            let tuser = this.findValidUser(user);
            if (tuser) {
                tuser.state = state;
                //if use is globally marked as absent then mark user as absent in all hosts categories and groups
                if(state==='absent') {
                    //user state in hosts
                    let hosts = this.provider.managers.hostManager.validHosts;
                    hosts.forEach((host)=> {
                        let userAccount = this.getUserAccountForUser(host, tUser);
                        if (userAccount) {
                            userAccount.user.state = state;
                        }
                    });
                    //user state in usercategories
                    let userCategories = this.provider.managers.userCategories.findCategoriesForUser(tUser);
                    userCategories.forEach((userCategory)=> {
                        let ttUser = userCategory.findUser(tUser);
                        if (ttUser) ttUser.state = state;
                    });
                    //user state in group categories
                    let groupCategories = this.provider.managers.groupCategories.findCategoriesWithUser(tUser);
                    groupCategories.forEach((groupCategory)=> {
                        groupCategory.findUser(tUser).state = state;
                    });
                }
            } else {
                logger.warn(`User ${user.name? user.name: user} requested to be marked as ${state} is not a valid user.`);
            }
        } else {
            logger.warn("User parameter must be a username or instance of User.");
        }
    }


    deleteUser(user, updateHosts = true) {
        if ((typeof user == 'string') || user instanceof User) {
            let username;
            if (user instanceof User) {
                username = user.name;
            } else {
                username = user;
            }
            let rUser = this.validUsers.forEach((user, index, array)=> {
                if (user.name === username) {
                    array.splice(index, 1);
                    return user;
                }
            });
            if (!rUser) {
                logger.warn("User requested to be marked as absent is not a valid user.");
            } else if (updateHosts) {
                this.provider.managers.hostManager.validHosts.forEach((host)=> {
                    this.deleteUserFromHost(host,user);
                });
                //update UserCategories
                this.provider.managers.userCategories.categories.forEach((cat)=> {
                    cat.userAccounts.find((userAccount, index, array)=> {
                        if (userAccount.user.name === username) {
                            array.splice(index, 1);
                            return userAccount;
                        }
                    });
                });
            }
        } else {
            logger.warn("User parameter must be a username or instance of User.");
        }
    }

    deleteUserFromHost(host,username){
        let hostUsers = this.userManager.getUserAccounts(host);
        hostUsers.find((hostUser, index, array)=> {
            if (hostUser.user.name = username) {
                array.splice(index, 1);
                return hostUser;
            }
        });
    }

    

}

export default UserManager;