"use strict";

import logger from './../../Logger';
import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';

class User {
    /*
     Parameter can be user name or data structure:
     {
     name: <username>,
     stat: <"present"|"absent">,
     uid: <int>,
     key: <path to user's public key
     }
     */
    constructor(data) {
        //super();
        //check if we were provided with a user name or a data object
        if (typeof data === 'string') {
            var valid = /\w/;
            if (!valid.test(data)) {
                throw new Error(`${data} is an invalid user name`);
            }
            this.data = {
                name: data,
                state: "present",
                key: undefined,
                uid: undefined
            };
            return;
        }

        if (!data.name) {
            logger.logAndThrow("The parameter data must be a user name or an object with a mandatory property \"name\".");
        }

        if (!data.state) {
            data.state = "present";
        } else if (data.state != "present" && data.state != "absent") {
            logger.logAndThrow("User state must be \"present\" or \"absent\".");
        }

        if (data.uid && typeof data.uid !== 'number') {
            logger.logAndThrow("Uid must be a number.");
        }

            this.data = {
                name: data.name,
                uid: data.uid,
                key: data.key,
                state: data.state ? data.state : "present"
            };
    }

    get name() {
        return this.data.name;
    }

    get state() {
        return this.data.state;
    }

    get keyPath(){
        return this.data.key;
    }

    get key() {
        if (this.keyPath) {
            try {
                let p = path.resolve(this.keyPath);
                let key =  fs.readFileSync(p);
                return key.toString();
            }catch(e){
                logger.logAndThrow(`Error reading public key for user ${this.data.name} from file ${this.keyPath} - ${e.message}`);
            }
        }
     }

    setKey(provider,key) {
        return new Promise((resolve)=> {
            let dir = path.resolve(provider.getDBDir(),
                provider.config.get("keydir"), this.data.name);
            let kpath = path.resolve(dir,this.data.name + "_vincent.pub");
            try{
                fs.statSync(dir);
            }catch(e){
                let mode = parseInt("700",8);
                mkdirp(dir,{mode:mode});
            }
            this.data.key = kpath;
            fs.writeFile(kpath, key,(err)=>{
                if(err){
                    resolve(`There was an error saving public key for user ${this.data.name} - ${err}.`);
                }else{
                    resolve(`Successfully saved public key for user ${this.data.name}.`);
                }
            });
        });
    }

    get uid() {
        return this.data.uid;
    }

    merge(user) {
        if (user.name !== this.data.name) {
            logger.logAndThrow(`User ${user.name} does not match ${this.data.name}`);
        } else {
            if (!this.data.key && user.key) {
                this.data.key = user.key
            }

            if (!this.data.uid) {
                this.data.uid = user.uid;
            }

            if (this.data.state === 'absent' || user.state == "absent") {
                this.data.state = "absent";
            } else {
                this.data.state = "present";
            }
        }
        return this;
    }

    clone() {
        return new User(this.data);
    }

    export() {
        return this.data;
    }

    exportId() {
        return {name: this.data.name, state: this.data.state};
    }
}

export default User;